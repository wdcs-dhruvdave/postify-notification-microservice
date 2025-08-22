import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
  ) {}

  async createNotification(notificationDto: CreateNotificationDto) {
    const notification = await this.notificationModel.create(notificationDto);
    return notification;
  }

  async findAllforUser(userId: string) {
    return this.notificationModel
      .find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();
  }

  async markAsRead(userId: string) {
    await this.notificationModel.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } },
    );
    return { message: 'Notifications marked as read' };
  }
}
