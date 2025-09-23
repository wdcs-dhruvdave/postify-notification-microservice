import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  BelongsToMany,
} from 'sequelize-typescript';
import Participant from './participant.model';
import Message from './message.model';
import User from './user.model';

@Table({ tableName: 'conversations', underscored: true, timestamps: true })
export class Conversation extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @HasMany(() => Message)
  messages: Message[];

  @HasMany(() => Participant, 'conversationId')
  participantsMeta: Participant[];

  @BelongsToMany(() => User, {
    through: () => Participant,
    foreignKey: 'conversationId',
    otherKey: 'userId',
  })
  participants: User[];
}

export default Conversation;
