import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Logger } from '@nestjs/common';
import {
  CONFIG,
  SocketEvent,
  WebSocketNamespace,
  MESSAGES,
} from '../common/constants/constants';

@WebSocketGateway({
  namespace: WebSocketNamespace.CHAT,
  cors: CONFIG.WEBSOCKET.CORS,
  pingTimeout: CONFIG.WEBSOCKET.TIMEOUTS.PING_TIMEOUT,
  pingInterval: CONFIG.WEBSOCKET.TIMEOUTS.PING_INTERVAL,
  transports: CONFIG.WEBSOCKET.TRANSPORTS,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private clients: Map<string, { socketId: string; conversationId?: string }> =
    new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`${MESSAGES.LOG.CONNECTION_ATTEMPT} ${client.id}`);
    const token = (client.handshake.auth as { token?: string })?.token;

    if (!token) {
      this.logger.warn(MESSAGES.AUTH.NO_TOKEN_DISCONNECTING);
      client.disconnect();
      return;
    }

    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      // this.logger.log(`${MESSAGES.LOG.JWT_SECRET_DEBUG}${jwtSecret}]`);

      // this.logger.log(`${MESSAGES.LOG.JWT_SECRET_EXISTS} ${!!jwtSecret}`);
      // this.logger.log(`${MESSAGES.LOG.FULL_TOKEN_RECEIVED} ${token}`);
      if (!jwtSecret) {
        this.logger.error(MESSAGES.AUTH.JWT_SECRET_UNDEFINED_CONFIG);
        client.disconnect();
        return;
      }

      const decoded = jwt.verify(token, jwtSecret) as { id: string };
      const userId = decoded.id;

      if (!userId) {
        this.logger.warn(MESSAGES.AUTH.TOKEN_NO_USER_ID);
        client.disconnect();
        return;
      }

      const existingClient = this.clients.get(userId);
      if (existingClient) {
        this.logger.log(`User ${userId} ${MESSAGES.LOG.USER_RECONNECTING}`);
        this.clients.delete(userId);
      }

      void client.join(userId);
      this.clients.set(userId, { socketId: client.id });
      this.logger.log(
        `${MESSAGES.LOG.CLIENT_CONNECTED} ${userId} ${MESSAGES.LOG.USER_JOINED_ROOM} ${client.id}`,
      );
    } catch (e) {
      this.logger.error(
        MESSAGES.LOG.AUTHENTICATION_ERROR,
        e instanceof Error ? e.message : String(e),
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, clientData] of this.clients.entries()) {
      if (clientData.socketId === client.id) {
        this.clients.delete(userId);
        this.logger.log(`${MESSAGES.LOG.CLIENT_DISCONNECTED} User ${userId}`);
        break;
      }
    }
  }

  @SubscribeMessage(SocketEvent.JOIN_CONVERSATION)
  handleJoinRoom(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(conversationId);
    this.logger.log(
      `Socket ${client.id} ${MESSAGES.LOG.SOCKET_JOINED_CONVERSATION} ${conversationId}`,
    );
  }

  @SubscribeMessage(SocketEvent.SWITCH_CONVERSATION)
  handleSwitchConversation(
    @MessageBody()
    data: { oldConversationId?: string; newConversationId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.oldConversationId) {
      void client.leave(data.oldConversationId);
      this.logger.log(
        `Socket ${client.id} ${MESSAGES.LOG.SOCKET_LEFT_CONVERSATION} ${data.oldConversationId}`,
      );
    }
    if (data.newConversationId) {
      void client.join(data.newConversationId);
      this.logger.log(
        `Socket ${client.id} ${MESSAGES.LOG.SOCKET_JOINED_NEW_CONVERSATION} ${data.newConversationId}`,
      );
    }
  }

  @SubscribeMessage(SocketEvent.LEAVE_CONVERSATION)
  handleLeaveRoom(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    void client.leave(conversationId);
    this.logger.log(
      `Socket ${client.id} ${MESSAGES.LOG.SOCKET_LEFT_SHARED_CONVERSATION} ${conversationId}`,
    );
  }

  @SubscribeMessage(SocketEvent.SEND_MESSAGE)
  async handleSendMessage(
    @MessageBody() data: CreateMessageDto & { tempId?: string },
  ) {
    this.logger.log(
      `${MESSAGES.LOG.SEND_MESSAGE_RECEIVED} ${JSON.stringify(data)}`,
    );
    try {
      this.logger.log(
        `${MESSAGES.LOG.SERVER_PROPERTIES} ${Object.keys(this.server).join(', ')}`,
      );
      this.logger.log(`${MESSAGES.LOG.HAS_ADAPTER} ${!!this.server.adapter}`);
      this.logger.log(`${MESSAGES.LOG.HAS_SOCKETS} ${!!this.server.sockets}`);

      const newMessage = await this.chatService.createMessage(data);
      this.logger.log(
        `${MESSAGES.LOG.MESSAGE_SAVED_TO_DB} ${JSON.stringify(newMessage.toJSON())}`,
      );

      const conversation =
        await this.chatService.getConversationWithParticipants(
          data.conversationId,
        );

      const messageToSend: Record<string, unknown> = {
        ...newMessage.toJSON(),
        tempId: data.tempId,
      };

      this.logger.log(
        `${MESSAGES.LOG.EMITTING_RECEIVE_MESSAGE} ${data.conversationId}`,
      );
      this.server
        .to(data.conversationId)
        .emit(SocketEvent.RECEIVE_MESSAGE, messageToSend);

      if (conversation && conversation.participants) {
        for (const participant of conversation.participants) {
          if (participant.id !== data.senderId) {
            const participantClient = this.clients.get(participant.id);

            if (participantClient) {
              this.logger.log(
                `${MESSAGES.LOG.SENDING_UNREAD_NOTIFICATION} ${participant.id}`,
              );
              this.server
                .to(participant.id)
                .emit(SocketEvent.UNREAD_MESSAGE_NOTIFICATION, {
                  conversationId: data.conversationId,
                  lastMessage: messageToSend,
                  senderName:
                    typeof newMessage.sender === 'object' &&
                    newMessage.sender !== null
                      ? (newMessage.sender as { username?: string }).username
                      : undefined,
                });
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(
        MESSAGES.LOG.SEND_MESSAGE_ERROR,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
export default ChatGateway;
