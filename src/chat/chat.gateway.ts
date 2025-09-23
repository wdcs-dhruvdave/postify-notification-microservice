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

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private clients: Map<string, string> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    const token = (client.handshake.auth as { token?: string })?.token;
    if (token) {
      try {
        const jwtSecret = this.configService.get<string>('JWT_SECRET');
        if (!jwtSecret) {
          this.logger.error('JWT_SECRET is not defined in configuration.');
          client.disconnect();
          return;
        }
        const decoded = jwt.verify(token, jwtSecret) as unknown as {
          id: string;
        };

        const userId = decoded.id;
        if (userId) {
          void client.join(userId);
          this.clients.set(userId, client.id);
          this.logger.log(
            `Client Connected: User ${userId} joined personal room.`,
          );
        } else {
          this.logger.warn(
            'Token decoded but no user ID found. Disconnecting.',
          );
          client.disconnect();
        }
      } catch (e) {
        this.logger.error(
          'Authentication error, disconnecting client:',
          e instanceof Error ? e.message : String(e),
        );
        client.disconnect();
      }
    } else {
      this.logger.log('No token provided, disconnecting client.');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.clients.entries()) {
      if (socketId === client.id) {
        this.clients.delete(userId);
        this.logger.log(`Client Disconnected: User ${userId}`);
        break;
      }
    }
  }

  @SubscribeMessage('join_conversation')
  handleJoinRoom(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(conversationId);
    this.logger.log(
      `Socket ${client.id} joined shared conversation room ${conversationId}`,
    );
  }

  @SubscribeMessage('switch_conversation')
  handleSwitchConversation(
    @MessageBody()
    data: { oldConversationId?: string; newConversationId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.oldConversationId) {
      void client.leave(data.oldConversationId);
      this.logger.log(
        `Socket ${client.id} left conversation room ${data.oldConversationId}`,
      );
    }
    if (data.newConversationId) {
      void client.join(data.newConversationId);
      this.logger.log(
        `Socket ${client.id} joined conversation room ${data.newConversationId}`,
      );
    }
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveRoom(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    void client.leave(conversationId);
    this.logger.log(
      `Socket ${client.id} left shared conversation room ${conversationId}`,
    );
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: CreateMessageDto & { tempId?: string },
  ) {
    this.logger.log(`[send_message] Received: ${JSON.stringify(data)}`);
    try {
      this.logger.log(
        `Server properties: ${Object.keys(this.server).join(', ')}`,
      );
      this.logger.log(`Has adapter: ${!!this.server.adapter}`);
      this.logger.log(`Has sockets: ${!!this.server.sockets}`);

      const newMessage = await this.chatService.createMessage(data);
      this.logger.log(
        `[send_message] Message saved to DB: ${JSON.stringify(newMessage.toJSON())}`,
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
        `Emitting 'receive_message' to room ${data.conversationId}`,
      );
      this.server
        .to(data.conversationId)
        .emit('receive_message', messageToSend);

      if (conversation && conversation.participants) {
        for (const participant of conversation.participants) {
          if (participant.id !== data.senderId) {
            const participantSocketId = this.clients.get(participant.id);

            if (participantSocketId) {
              this.logger.log(
                `Sending unread message notification to user ${participant.id}`,
              );
              this.server
                .to(participant.id)
                .emit('unread_message_notification', {
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
        '[send_message] Error processing message:',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
export default ChatGateway;
