import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Unique,
} from 'sequelize-typescript';
import { Conversation } from './conversation.model';
import { User } from './user.model';

@Table({
  tableName: 'participants',
  underscored: true,
  timestamps: false,
})
export class Participant extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Conversation)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare conversationId: string;

  @Unique('conversation_user_unique_constraint')
  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare userId: string;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  declare lastReadAt: Date;

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Conversation)
  conversation: Conversation;
}

export default Participant;
