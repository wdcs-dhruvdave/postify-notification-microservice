import { Body, Controller, Get, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { UserId } from '../auth/user.decorator';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@UserId() userId: string) {
    return this.notificationsService.findAllForUser(userId);
  }

  @Post('read')
  markAsRead(@UserId() userId: string) {
    return this.notificationsService.markAsRead(userId);
  }

  @Post()
  createNotification(@Body() body: CreateNotificationDto) {
    console.log(
      '📧 Received notification request:',
      JSON.stringify(body, null, 2),
    );
    return this.notificationsService.createAndPush(body);
  }

  @Post('test')
  async testNotification(
    @Body()
    body: {
      userId: number;
      title: string;
      message: string;
      type: string;
    },
  ) {
    try {
      const { userId, title, message, type } = body;

      // Send test notification using the service
      const result = await this.notificationsService.sendTestNotification(
        userId.toString(),
        title,
        message,
        type,
      );

      return {
        success: true,
        message: 'Test notification sent successfully',
        notification: result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send test notification',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
