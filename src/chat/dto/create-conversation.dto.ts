import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @IsNotEmpty({ message: 'Receiver ID must not be empty.' })
  @IsUUID('4', { message: 'Receiver ID must be a valid UUID.' })
  receiverId: string;
}
