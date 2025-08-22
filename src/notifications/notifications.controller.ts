import { Body, Controller, Get, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { UserId } from '../auth/user.decorator';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@UserId() userId: string) {
    return this.notificationsService.findAllforUser(userId);
  }

  @Post('read')
  markAsRead(@UserId() userId: string) {
    return this.notificationsService.markAsRead(userId);
  }

  @Post()
  createNotification(@Body() body: CreateNotificationDto) {
    return this.notificationsService.createNotification(body);
  }
}
