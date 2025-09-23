import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import Conversation from '../models/conversation.model';
import Message from '../models/message.model';
import Participant from '../models/participant.model';
import User from '../models/user.model';
import { CreateMessageDto } from './dto/create-message.dto';
// import { TABLE_NAMES, COLUMN_NAMES } from '../../common/constants/db.constant';
// import { CHAT_ERROR_MESSAGES } from '../../common/constants/messages.constant';
// import { PAGINATION_DEFAULTS, CHAT_CONFIG } from '../../common/constants/config.constant';
// import { DEFAULT_VALUES } from '../../common/constants/default.constant';

export interface ConversationPreview {
  id: string;
  updatedAt: Date;
  participants: { id: string; username: string; avatar_url: string | null }[];
  lastMessage: {
    id: string;
    contentText: string;
    createdAt: Date;
    senderId: string;
  } | null;
  unreadCount: number;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Conversation) private conversationModel: typeof Conversation,
    @InjectModel(Message) private messageModel: typeof Message,
    @InjectModel(Participant) private participantModel: typeof Participant,
    private sequelize: Sequelize,
  ) {}

  async findUserConversationsWithDetails(
    userId: string,
  ): Promise<ConversationPreview[]> {
    this.logger.log(
      `[findUserConversationsWithDetails] Called for userId: ${userId}`,
    );
    const query = `
      SELECT
        c.id,
        c.updated_at AS "updatedAt",
        (
          SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'avatar_url', u.avatar_url))
          FROM participants p_inner
          JOIN users u ON u.id = p_inner.user_id
          WHERE p_inner.conversation_id = c.id AND p_inner.user_id != :userId
        ) AS participants,
        (
          SELECT json_build_object(
            'id', m.id,
            'content', m.content,
            'createdAt', m.created_at,
            'senderId', m.sender_id
          )
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS "lastMessage",
        (
          SELECT COUNT(*) 
          FROM messages m
          WHERE m.conversation_id = c.id
          AND m.sender_id != :userId
          AND m.created_at > COALESCE(
            (SELECT p_read.last_read_at 
             FROM participants p_read 
             WHERE p_read.conversation_id = c.id AND p_read.user_id = :userId),
            '1970-01-01'::TIMESTAMPTZ
          )
        )::int AS "unreadCount"
      FROM conversations c
      WHERE c.id IN (
        SELECT conversation_id FROM participants WHERE user_id = :userId
      )
      ORDER BY c.updated_at DESC;
    `;

    try {
      this.logger.log(
        `[findUserConversationsWithDetails] Executing raw query for userId: ${userId}`,
      );
      const conversations = await this.sequelize.query<ConversationPreview>(
        query,
        {
          replacements: { userId },
          type: QueryTypes.SELECT,
        },
      );
      this.logger.log(
        `[findUserConversationsWithDetails] Found ${conversations.length} conversations for userId: ${userId}`,
      );
      return conversations;
    } catch (error) {
      this.logger.error(
        `[findUserConversationsWithDetails] Failed to execute query for userId: ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async markConversationAsRead(userId: string, conversationId: string) {
    this.logger.log(
      `[markConversationAsRead] Called for userId: ${userId}, conversationId: ${conversationId}`,
    );
    try {
      const [affectedCount] = await this.participantModel.update(
        { lastReadAt: new Date() },
        { where: { userId, conversationId }, returning: false },
      );
      this.logger.log(
        `[markConversationAsRead] Participant table updated. Rows affected: ${affectedCount}`,
      );
      return { success: true, affectedCount };
    } catch (error) {
      this.logger.error(
        `[markConversationAsRead] Failed for userId: ${userId}, conversationId: ${conversationId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async findOrCreateConversation(
    senderId: string,
    receiverId: string,
  ): Promise<{ conversationId: string; isNew: boolean }> {
    this.logger.log(
      `[findOrCreateConversation] Called for senderId: ${senderId}, receiverId: ${receiverId}`,
    );

    if (senderId === receiverId) {
      this.logger.warn(
        `[findOrCreateConversation] Attempted to create a conversation with the same user: ${senderId}`,
      );
      throw new BadRequestException(
        'Cannot create a conversation with yourself.',
      );
    }

    if (!senderId || !receiverId) {
      this.logger.error(
        `[findOrCreateConversation] Invalid IDs provided: senderId=${senderId}, receiverId=${receiverId}`,
      );
      throw new Error('Both senderId and receiverId must be provided.');
    }

    const query = `
      SELECT p.conversation_id
      FROM participants AS p
      WHERE p.user_id IN (?, ?)
      GROUP BY p.conversation_id
      HAVING COUNT(DISTINCT p.user_id) = 2 AND (
        SELECT COUNT(*) FROM participants p_count WHERE p_count.conversation_id = p.conversation_id
      ) = 2
      LIMIT 1;
    `;

    this.logger.log(
      '[findOrCreateConversation] Searching for existing conversation.',
    );
    const result = await this.sequelize.query<{ conversation_id: string }>(
      query,
      {
        replacements: [senderId, receiverId],
        type: QueryTypes.SELECT,
        plain: true,
      },
    );

    if (result) {
      this.logger.log(
        `[findOrCreateConversation] Found existing conversationId: ${result.conversation_id}`,
      );
      return { conversationId: result.conversation_id, isNew: false };
    }

    this.logger.log(
      '[findOrCreateConversation] No existing conversation found. Creating a new one.',
    );
    const t = await this.sequelize.transaction();
    this.logger.log('[findOrCreateConversation] Transaction started.');
    try {
      const newConversation = await this.conversationModel.create(
        {},
        { transaction: t },
      );
      this.logger.log(
        `[findOrCreateConversation] New conversation created with id: ${newConversation.id}`,
      );

      await this.participantModel.bulkCreate(
        [
          { conversationId: newConversation.id, userId: senderId },
          { conversationId: newConversation.id, userId: receiverId },
        ],
        { transaction: t },
      );
      this.logger.log(
        `[findOrCreateConversation] Participants created for conversationId: ${newConversation.id}`,
      );

      await t.commit();
      this.logger.log('[findOrCreateConversation] Transaction committed.');
      return { conversationId: newConversation.id, isNew: true };
    } catch (error) {
      this.logger.error(
        `[findOrCreateConversation] Error creating new conversation. Rolling back transaction.`,
        error instanceof Error ? error.stack : String(error),
      );
      await t.rollback();
      this.logger.log('[findOrCreateConversation] Transaction rolled back.');
      throw error;
    }
  }

  async createMessage(createMessageDto: CreateMessageDto): Promise<Message> {
    this.logger.log(
      `[createMessage] Attempting to create message: ${JSON.stringify(
        createMessageDto,
      )}`,
    );
    const t = await this.sequelize.transaction();
    this.logger.log('[createMessage] Transaction started.');

    try {
      const { conversationId, senderId, content, mediaUrl, mediaType } =
        createMessageDto;

      const newMessage = await this.messageModel.create(
        {
          conversationId,
          senderId,
          contentText: content,
          mediaUrl,
          mediaType,
        },
        { transaction: t },
      );
      this.logger.log(
        `[createMessage] Message created in transaction with temp id: ${newMessage.id}`,
      );

      await this.conversationModel.update(
        { updatedAt: new Date() },
        { where: { id: conversationId }, transaction: t },
      );
      this.logger.log(
        `[createMessage] Conversation ${conversationId} timestamp updated.`,
      );

      await t.commit();
      this.logger.log('[createMessage] Transaction committed successfully.');

      this.logger.log(
        `[createMessage] Fetching full message details for id: ${newMessage.id}`,
      );
      const message = await Message.findByPk(newMessage.id, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'name', 'avatar_url'],
          },
        ],
      });

      if (!message) {
        this.logger.error(
          `[createMessage] CRITICAL: Message not found after creation and commit. ID: ${newMessage.id}`,
        );
        throw new Error('Message not found after creation');
      }
      this.logger.log(
        `[createMessage] Successfully created and returning message: ${message.id}`,
      );
      return message;
    } catch (error: unknown) {
      this.logger.error(
        '[createMessage] Error occurred. Rolling back transaction.',
        error instanceof Error ? error.stack : String(error),
      );
      await t.rollback();
      this.logger.error('[createMessage] Error details:', error);
      this.logger.error(
        'Sequelize message:',
        error instanceof Error ? error.message : String(error),
      );
      this.logger.error(
        'Sequelize stack:',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
  async findConversationMessages(
    conversationId: string,
    page: number,
    limit: number,
  ): Promise<Message[]> {
    this.logger.log(
      `[findConversationMessages] Called for conversationId: ${conversationId}, page: ${page}, limit: ${limit}`,
    );
    const offset = (page - 1) * limit;
    this.logger.log(`[findConversationMessages] Calculated offset: ${offset}`);
    try {
      const messages = await this.messageModel.findAll({
        where: { conversationId },
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'avatar_url'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });
      this.logger.log(
        `[findConversationMessages] Found ${messages.length} messages.`,
      );
      return messages;
    } catch (error) {
      this.logger.error(
        `[findConversationMessages] Failed to find messages for conversationId: ${conversationId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async getConversationWithParticipants(
    conversationId: string,
  ): Promise<Conversation | null> {
    this.logger.log(
      `[getConversationWithParticipants] Called for conversationId: ${conversationId}`,
    );
    try {
      const conversation =
        await this.conversationModel.findByPk(conversationId);
      if (!conversation) {
        this.logger.log(
          `[getConversationWithParticipants] Conversation not found.`,
        );
        return null;
      }

      const participantsQuery = `
        SELECT
          u.id,
          u.username,
          u.avatar_url
        FROM participants p
        JOIN users u ON u.id = p.user_id
        WHERE p.conversation_id = :conversationId
      `;

      const participants = await this.sequelize.query(participantsQuery, {
        replacements: { conversationId },
        type: QueryTypes.SELECT,
        model: User,
        mapToModel: true,
      });

      conversation.participants = participants;

      this.logger.log(
        `[getConversationWithParticipants] Found conversation with ${conversation.participants?.length} participants.`,
      );

      return conversation;
    } catch (error) {
      this.logger.error(
        `[getConversationWithParticipants] Failed to find conversation for conversationId: ${conversationId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
