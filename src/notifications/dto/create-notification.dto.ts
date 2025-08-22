export class CreateNotificationDto {
  recipientId: string | number;
  senderId: string | number;
  type: 'like' | 'dislike' | 'comment' | 'follow';
  postId?: string;
}
