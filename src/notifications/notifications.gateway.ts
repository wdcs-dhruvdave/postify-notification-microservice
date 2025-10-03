import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { CONFIG, MESSAGES } from '../common/constants/constants';

@WebSocketGateway({ cors: CONFIG.WEBSOCKET.CORS })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth as { token?: string })?.token;
      if (!token) {
        throw new Error(MESSAGES.AUTH.NO_TOKEN_PROVIDED);
      }
      if (!process.env.JWT_SECRET) {
        throw new Error(MESSAGES.AUTH.JWT_SECRET_NOT_DEFINED);
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
        id: string;
      };
      const userId = decoded?.id;

      await client.join(userId);
      console.log(`User ${userId} connected with socket ${client.id}`);
    } catch (error) {
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? (error as { message: string }).message
          : String(error);
      console.error(MESSAGES.AUTH.INVALID_TOKEN, errorMessage);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  sendNotification(userId: string, notification: any) {
    this.server.to(userId).emit('notification', notification);
  }
}
