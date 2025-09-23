import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import Conversation from '../models/conversation.model';
import Message from '../models/message.model';
import Participant from '../models/participant.model';
import User from '../models/user.model';

@Module({
  imports: [
    SequelizeModule.forFeature([Conversation, Participant, Message, User]),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
})
export class ChatModule {}
