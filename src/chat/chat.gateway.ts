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
import Conversation from '../models/conversation.model';
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
      const newMessage = await this.chatService.createMessage(data);
      this.logger.log(
        `[send_message] Message saved to DB: ${JSON.stringify(newMessage.toJSON())}`,
      );

      let conversation: Conversation | null = null;
      try {
        conversation = await this.chatService.getConversationWithParticipants(
          data.conversationId,
        );
      } catch (err) {
        this.logger.error(
          `[send_message] Error fetching conversation:`,
          err instanceof Error ? err.stack : String(err),
        );
        conversation = null;
      }

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

      if (conversation) {
        const notifyUsers = conversation.participants ?? [];

        if (notifyUsers.length > 0) {
          this.logger.log(
            `Notifying ${notifyUsers.length} users in conversation.`,
          );
          for (const user of notifyUsers) {
            if (user.id !== data.senderId) {
              this.logger.log(`Sending notification to user ${user.id}`);
              this.server.to(user.id).emit('unread_message_notification', {
                conversationId: data.conversationId,
                lastMessage: messageToSend,
              });
            }
          }
        } else {
          this.logger.warn(
            `No users/participants found for conversation ${data.conversationId}`,
          );
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
