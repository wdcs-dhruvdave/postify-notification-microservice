import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsGateway } from './notifications.gateway';
import { FCMService } from './fcm.service';
import { CONFIG, MESSAGES } from '../common/constants/constants';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    private readonly gateway: NotificationsGateway,
    private readonly fcmService: FCMService,
  ) {}

  async createAndPush(
    notificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    console.log('Creating notification with data:', notificationDto);

    // Fetch sender details from backend
    const senderInfo = await this.getUserInfo(
      notificationDto.senderId.toString(),
    );

    if (!senderInfo) {
      throw new Error(`Sender not found: ${notificationDto.senderId}`);
    }

    // Transform DTO to entity format
    const notificationData = {
      recipient: notificationDto.recipientId.toString(),
      sender: {
        id: senderInfo.id,
        username: senderInfo.username,
        avatar_url: senderInfo.avatar_url,
      },
      type: notificationDto.type,
      post: notificationDto.postId,
    };

    const newNotification = new this.notificationModel(notificationData);
    await newNotification.save();

    // Send real-time notification via WebSocket
    this.gateway.sendNotification(
      newNotification.recipient,
      newNotification.toObject(),
    );

    // Send push notification via FCM
    await this.sendFCMNotification(newNotification);

    console.log('Notification created and pushed:', newNotification.toObject());
    return newNotification;
  }

  private async sendFCMNotification(notification: Notification): Promise<void> {
    try {
      // Get user's FCM tokens from backend
      const userTokens = await this.getUserFCMTokens(notification.recipient);

      if (!userTokens || userTokens.length === 0) {
        console.log('No FCM tokens found for user:', notification.recipient);
        return;
      }

      // Prepare FCM payload
      const fcmPayload = {
        title: this.getNotificationTitle(notification),
        body: this.getNotificationBody(notification),
        data: {
          type: notification.type,
          senderId: notification.sender.id,
          postId: notification.post || '',
          url: this.getNotificationUrl(notification),
        },
      };

      // Send FCM notification
      const result = await this.fcmService.sendToDevices(
        userTokens,
        fcmPayload,
      );
      console.log(
        `FCM notification sent - Success: ${result.success}, Failed: ${result.failure}`,
      );
    } catch (error) {
      console.error('Error sending FCM notification:', error);
    }
  }

  private async getUserInfo(
    userId: string,
  ): Promise<{ id: string; username: string; avatar_url?: string } | null> {
    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
      const response = await axios.get<{
        id: string;
        username: string;
        avatar_url?: string;
      }>(`${backendUrl}/api/internal/users/${userId}`);

      const userData = response.data;
      return {
        id: userData.id,
        username: userData.username,
        avatar_url: userData.avatar_url,
      };
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }

  private async getUserFCMTokens(userId: string): Promise<string[]> {
    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
      const response = await axios.get<{ tokens: string[] }>(
        `${backendUrl}/api/internal/users/${userId}/fcm-tokens`,
      );
      return response.data.tokens || [];
    } catch (error) {
      console.error('Error fetching user FCM tokens:', error);
      return [];
    }
  }

  private getNotificationTitle(notification: Notification): string {
    const senderName = notification.sender.username || 'Someone';

    switch (notification.type) {
      case 'like':
        return `${senderName} liked your post`;
      case 'dislike':
        return `${senderName} disliked your post`;
      case 'comment':
        return `${senderName} commented on your post`;
      case 'follow':
        return `${senderName} started following you`;
      default:
        return `New notification from ${senderName}`;
    }
  }

  private getNotificationBody(notification: Notification): string {
    const senderName = notification.sender.username || 'Someone';

    switch (notification.type) {
      case 'like':
        return `${senderName} liked your post. Tap to view.`;
      case 'dislike':
        return `${senderName} disliked your post. Tap to view.`;
      case 'comment':
        return `${senderName} left a comment on your post. Tap to view.`;
      case 'follow':
        return `${senderName} is now following you. Check out their profile!`;
      default:
        return `You have a new notification from ${senderName}.`;
    }
  }

  private getNotificationUrl(notification: Notification): string {
    switch (notification.type) {
      case 'like':
      case 'dislike':
      case 'comment':
        return notification.post ? `/posts/${notification.post}` : '/feed';
      case 'follow':
        return `/profile/${notification.sender.id}`;
      default:
        return '/feed';
    }
  }

  async findAllForUser(userId: string): Promise<Notification[]> {
    return this.notificationModel
      .find({ recipient: userId })
      .sort({ createdAt: CONFIG.NOTIFICATION.SORT_ORDER as 1 | -1 })
      .limit(CONFIG.NOTIFICATION.DEFAULT_LIMIT)
      .exec();
  }

  async markAsRead(userId: string) {
    await this.notificationModel.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } },
    );
    return { message: MESSAGES.NOTIFICATION.MARKED_AS_READ };
  }

  async sendTestNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
  ): Promise<{
    recipient: string;
    title: string;
    message: string;
    type: string;
    sentAt: Date;
  }> {
    try {
      console.log('Sending test notification:', {
        userId,
        title,
        message,
        type,
      });

      // Send real-time notification via WebSocket (test format)
      this.gateway.sendNotification(userId, {
        recipient: userId,
        sender: {
          id: 'system',
          username: 'System',
          avatar_url: '',
        },
        type: 'test',
        message: message,
        title: title,
        read: false,
        createdAt: new Date(),
      });

      // Send FCM notification directly
      await this.sendTestFCMNotification(userId, title, message);

      return {
        recipient: userId,
        title,
        message,
        type,
        sentAt: new Date(),
      };
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }

  private async sendTestFCMNotification(
    userId: string,
    title: string,
    message: string,
  ): Promise<void> {
    try {
      // Get user's FCM tokens from backend
      const userTokens = await this.getUserFCMTokens(userId);

      if (!userTokens || userTokens.length === 0) {
        console.log('No FCM tokens found for user:', userId);
        return;
      }

      // Prepare FCM payload
      const payload = {
        title: title,
        body: message,
        imageUrl: undefined,
        data: {
          type: 'test',
          userId: userId,
          timestamp: new Date().toISOString(),
        },
      };

      // Send to all user's devices
      const result = await this.fcmService.sendToDevices(userTokens, payload);
      console.log(
        `Test FCM notification sent to ${userTokens.length} device(s) for user ${userId}`,
      );
      console.log(`Success: ${result.success}, Failure: ${result.failure}`);
    } catch (error) {
      console.error('Error sending test FCM notification:', error);
    }
  }
}
