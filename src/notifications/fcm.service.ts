import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

interface FCMNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}

@Injectable()
export class FCMService {
  private messaging: admin.messaging.Messaging;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    if (admin.apps.length === 0) {
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}',
      ) as unknown as admin.ServiceAccount;

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
    this.messaging = admin.messaging();
  }

  async sendToDevice(
    token: string,
    payload: FCMNotificationPayload,
  ): Promise<boolean> {
    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            requireInteraction: true,
          },
          fcmOptions: {
            link: payload.data?.url || '/',
          },
        },
      };

      const response = await this.messaging.send(message);
      console.log('Successfully sent FCM message:', response);
      return true;
    } catch (error) {
      console.error('Error sending FCM message:', error);
      return false;
    }
  }

  async sendToDevices(
    tokens: string[],
    payload: FCMNotificationPayload,
  ): Promise<{ success: number; failure: number }> {
    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            requireInteraction: true,
          },
          fcmOptions: {
            link: payload.data?.url || '/',
          },
        },
      };

      const response = await this.messaging.sendEachForMulticast(message);

      return {
        success: response.successCount,
        failure: response.failureCount,
      };
    } catch (error) {
      console.error('Error sending multicast FCM message:', error);
      return { success: 0, failure: tokens.length };
    }
  }
}
