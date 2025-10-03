import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';

import { Conversation } from './models/conversation.model';
import { Message } from './models/message.model';
import { Participant } from './models/participant.model';
import User from './models/user.model';

import { CONFIG, MESSAGES } from './common/constants/constants';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): { uri: string } => {
        const uri = configService.get<string>('MONGO_URI');
        if (!uri) {
          throw new Error(MESSAGES.DATABASE.MONGO_URI_NOT_DEFINED);
        }
        return { uri };
      },
      inject: [ConfigService],
    }),

    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        dialect: CONFIG.DATABASE.POSTGRES.DIALECT,
        uri: configService.get<string>('DATABASE_URL'),
        models: [Conversation, Message, Participant, User],
        autoLoadModels: CONFIG.DATABASE.POSTGRES.AUTO_LOAD_MODELS,
        synchronize: CONFIG.DATABASE.POSTGRES.SYNCHRONIZE,
        logging: CONFIG.DATABASE.POSTGRES.LOGGING,
        // logging: (sql) => console.log('[Sequelize SQL]', sql),
      }),
      inject: [ConfigService],
    }),

    ChatModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
