import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
class Sender {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  username: string;

  @Prop()
  avatar_url: string;
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Notification extends Document {
  @Prop({ required: true, index: true })
  recipient: string;

  @Prop({ type: Sender, required: true })
  sender: Sender;

  @Prop({ required: true, enum: ['like', 'dislike', 'comment', 'follow'] })
  type: 'like' | 'dislike' | 'comment' | 'follow';

  @Prop()
  post?: string;

  @Prop({ default: false })
  read: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
