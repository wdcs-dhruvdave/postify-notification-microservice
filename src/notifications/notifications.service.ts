import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    private readonly gateway: NotificationsGateway,
  ) {}

  async createAndPush(
    notificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    console.log('Creating notification with data:', notificationDto);

    const newNotification = new this.notificationModel(notificationDto);
    await newNotification.save();

    this.gateway.sendNotification(
      newNotification.recipient,
      newNotification.toObject(),
    );

    console.log('Notification created and pushed:', newNotification.toObject());
    return newNotification;
  }

  async findAllForUser(userId: string): Promise<Notification[]> {
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
