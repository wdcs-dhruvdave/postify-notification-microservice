import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';

// Sequelize models
import { Conversation } from './models/conversation.model';
import { Message } from './models/message.model';
import { Participant } from './models/participant.model';
import User from './models/user.model';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // MongoDB (Mongoose)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): { uri: string } => {
        const uri = configService.get<string>('MONGO_URI');
        if (!uri) {
          throw new Error('MONGO_URI is not defined in environment variables');
        }
        return { uri };
      },
      inject: [ConfigService],
    }),

    // Postgres (Sequelize)
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        dialect: 'postgres',
        uri: configService.get<string>('DATABASE_URL'),
        models: [Conversation, Message, Participant, User],
        autoLoadModels: true,
        synchronize: false,
        logging: false,
        // logging: (sql) => console.log('[Sequelize SQL]', sql),
      }),
      inject: [ConfigService],
    }),

    // Feature Modules
    ChatModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
