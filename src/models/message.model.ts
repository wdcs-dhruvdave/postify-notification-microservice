import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  AllowNull,
} from 'sequelize-typescript';
import Conversation from './conversation.model';
import User from './user.model';

@Table({
  tableName: 'messages',
  underscored: true,
  timestamps: true,
})
export class Message extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Conversation)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare conversationId: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.UUID)
  declare senderId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'content',
  })
  declare contentText: string | null;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'media_url',
  })
  declare mediaUrl: string | null;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    field: 'media_type',
  })
  declare mediaType: string | null;

  @BelongsTo(() => Conversation, { onDelete: 'CASCADE' })
  declare conversation: Conversation;

  @BelongsTo(() => User, { onDelete: 'SET NULL' })
  declare sender: User;
}

export default Message;
