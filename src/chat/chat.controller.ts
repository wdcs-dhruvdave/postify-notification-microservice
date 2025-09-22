import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { UserId } from '../auth/user.decorator';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  findUserConversations(@UserId() userId: string) {
    if (!userId) return [];
    return this.chatService.findUserConversationsWithDetails(userId);
  }

  @Post('conversations/:id/read')
  markAsRead(@UserId() userId: string, @Param('id') conversationId: string) {
    if (!userId) return;
    return this.chatService.markConversationAsRead(userId, conversationId);
  }

  @Get('conversations/:id/messages')
  findConversationMessages(
    @Param('id') conversationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    return this.chatService.findConversationMessages(
      conversationId,
      pageNumber,
      limitNumber,
    );
  }

  @Post('conversations')
  findOrCreateConversation(
    @UserId() userId: string,
    @Body('receiverId') receiverId: string,
  ) {
    return this.chatService.findOrCreateConversation(userId, receiverId);
  }
}
