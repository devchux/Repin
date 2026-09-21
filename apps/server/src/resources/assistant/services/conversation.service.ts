import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Run } from '../../agent/entities/run.entity';
import { CreateConversationMessageDto } from '../dto/create-conversation-message.dto';
import { ExecuteDto } from '../dto/execute.dto';
import type {
  FindConversationDto,
  FindConversationsDto,
} from '../dto/find-assistant-items.dto';
import { ConversationMessage } from '../entities/conversation-message.entity';
import { Conversation } from '../entities/conversation.entity';
import { RunService } from './run.service';
import { truncateText } from '../../../shared/utils/helper';
import { ObservationStoreService } from '../../../shared/ai/context/observation-store.service';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Run) private readonly repository: Repository<Run>,
    private readonly runs: RunService,
    private readonly observations: ObservationStoreService,
  ) {}

  async createRun(
    userId: number,
    request: ExecuteDto,
    idempotencyKey?: string,
  ) {
    this.runs.validateRequest(request);
    const retainedContext = await this.observations.retain(
      userId,
      request.context,
    );
    const run = await this.repository.manager.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [userId]);
      if (idempotencyKey) {
        const existing = await manager.findOne(Run, {
          where: { userId, idempotencyKey },
        });
        if (existing) return existing;
      }
      await this.runs.assertQueueCapacity(manager, userId);
      const conversation = await manager.save(
        Conversation,
        manager.create(Conversation, {
          userId,
          initialCapability: request.capability,
          context: retainedContext,
          options: request.options,
        }),
      );
      const saved = await manager.save(
        Run,
        manager.create(Run, {
          userId,
          conversationId: conversation.id,
          capability: request.capability,
          context: retainedContext,
          input: request.input,
          options: request.options,
          browserSessionId: request.browserSessionId,
          browserExecutionTarget: request.browserExecutionTarget ?? 'extension',
          executionLane: this.runs.resolveExecutionLane(request),
          idempotencyKey,
          status: 'queued',
        }),
      );
      if (request.input?.trim()) {
        await manager.save(
          ConversationMessage,
          manager.create(ConversationMessage, {
            conversationId: conversation.id,
            runId: saved.id,
            role: 'user',
            content: request.input.trim(),
          }),
        );
      }
      return saved;
    });
    try {
      if (run.status === 'queued')
        await this.runs.enqueue(run.id, run.executionLane);
    } catch {
      await this.runs.markQueueFailure(run.id);
      throw new ServiceUnavailableException('Unable to queue assistant run');
    }
    return {
      message: 'Assistant run queued successfully',
      data: this.runs.toResponse(run),
    };
  }

  async findConversation(
    userId: number,
    conversationId: string,
    query: FindConversationDto,
  ) {
    const conversation = await this.findUserConversation(
      userId,
      conversationId,
    );
    const cursor = query.before
      ? this.decodeMessageCursor(query.before)
      : undefined;
    const messageBuilder = this.repository.manager
      .createQueryBuilder(ConversationMessage, 'message')
      .where('message.conversationId = :conversationId', { conversationId })
      .orderBy('message.createdAt', 'DESC')
      .addOrderBy('message.id', 'DESC')
      .take(query.limit + 1);
    if (cursor) {
      messageBuilder.andWhere(
        '(message.createdAt < :createdAt OR (message.createdAt = :createdAt AND message.id < :messageId))',
        { createdAt: cursor.createdAt, messageId: cursor.id },
      );
    }
    const descendingMessages = await messageBuilder.getMany();
    const hasMore = descendingMessages.length > query.limit;
    const pageMessages = descendingMessages.slice(0, query.limit).reverse();
    const oldestMessage = pageMessages[0];
    return {
      message: 'Assistant conversation found successfully',
      data: {
        id: conversation.id,
        initialCapability: conversation.initialCapability,
        context: conversation.context,
        messages: pageMessages.map((message) => ({
          id: message.id,
          runId: message.runId,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
        })),
        messagePage: {
          hasMore,
          nextCursor:
            hasMore && oldestMessage
              ? this.encodeMessageCursor(oldestMessage)
              : undefined,
        },
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    };
  }

  private encodeMessageCursor(message: ConversationMessage): string {
    return Buffer.from(
      JSON.stringify({
        createdAt: message.createdAt.toISOString(),
        id: message.id,
      }),
    ).toString('base64url');
  }

  private decodeMessageCursor(cursor: string): { createdAt: Date; id: string } {
    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as { createdAt?: unknown; id?: unknown };
      if (
        typeof parsed.createdAt !== 'string' ||
        Number.isNaN(Date.parse(parsed.createdAt)) ||
        typeof parsed.id !== 'string' ||
        !/^[0-9a-f-]{36}$/i.test(parsed.id)
      ) {
        throw new Error('Invalid cursor values');
      }
      return { createdAt: new Date(parsed.createdAt), id: parsed.id };
    } catch {
      throw new BadRequestException('Invalid conversation message cursor');
    }
  }

  async findConversations(userId: number, query: FindConversationsDto) {
    const builder = this.repository.manager
      .createQueryBuilder(Conversation, 'conversation')
      .where('conversation.userId = :userId', { userId });
    const search = query.search?.trim();
    if (search) {
      builder.andWhere(
        `(conversation.context ->> 'title' ILIKE :search OR EXISTS (
          SELECT 1 FROM assistant_conversation_messages searched_message
          WHERE searched_message."conversationId" = conversation.id
          AND searched_message.content ILIKE :search
        ))`,
        { search: `%${search}%` },
      );
    }
    if (query.capability) {
      builder.andWhere('conversation.initialCapability = :capability', {
        capability: query.capability,
      });
    }
    if (query.updatedAfter) {
      builder.andWhere('conversation.updatedAt >= :updatedAfter', {
        updatedAfter: new Date(query.updatedAfter),
      });
    }
    const total = await builder.getCount();
    const messageCountExpression = `(SELECT COUNT(*)::int FROM assistant_conversation_messages message_count WHERE message_count."conversationId" = conversation.id)`;
    const orderBy =
      query.sort === 'oldest'
        ? { field: 'conversation.updatedAt', direction: 'ASC' as const }
        : query.sort === 'created'
          ? { field: 'conversation.createdAt', direction: 'DESC' as const }
          : query.sort === 'messages'
            ? { field: messageCountExpression, direction: 'DESC' as const }
            : { field: 'conversation.updatedAt', direction: 'DESC' as const };
    const conversations = await builder
      .select('conversation.id', 'id')
      .addSelect('conversation.initialCapability', 'initialCapability')
      .addSelect('conversation.context', 'context')
      .addSelect('conversation.createdAt', 'createdAt')
      .addSelect('conversation.updatedAt', 'updatedAt')
      .addSelect(messageCountExpression, 'messageCount')
      .addSelect(
        `(SELECT first_message.content FROM assistant_conversation_messages first_message WHERE first_message."conversationId" = conversation.id AND first_message.role = 'user' ORDER BY first_message."createdAt" ASC LIMIT 1)`,
        'firstUserMessage',
      )
      .addSelect(
        `(SELECT last_message.content FROM assistant_conversation_messages last_message WHERE last_message."conversationId" = conversation.id ORDER BY last_message."createdAt" DESC LIMIT 1)`,
        'lastMessage',
      )
      .orderBy(orderBy.field, orderBy.direction)
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getRawMany<{
        id: string;
        initialCapability: Conversation['initialCapability'];
        context: Conversation['context'];
        createdAt: Date;
        updatedAt: Date;
        messageCount: number;
        firstUserMessage: string | null;
        lastMessage: string | null;
      }>();
    return {
      message: 'Assistant conversations found successfully',
      data: {
        items: conversations.map((conversation) => {
          const fallbackTitle =
            conversation.context.title || 'New conversation';
          return {
            id: conversation.id,
            initialCapability: conversation.initialCapability,
            title: truncateText(
              conversation.firstUserMessage || fallbackTitle,
              80,
            ),
            preview: truncateText(
              conversation.lastMessage || fallbackTitle,
              180,
            ),
            messageCount: Number(conversation.messageCount),
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
          };
        }),
        page: query.page,
        limit: query.limit,
        total,
        pageCount: Math.ceil(total / query.limit),
      },
    };
  }

  async createMessage(
    userId: number,
    conversationId: string,
    request: CreateConversationMessageDto,
  ) {
    const content = request.content.trim();
    const run = await this.repository.manager.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [userId]);
      const conversation = await manager.findOne(Conversation, {
        where: { id: conversationId, userId },
      });
      if (!conversation)
        throw new NotFoundException('Assistant conversation not found');
      const pending = await manager.count(Run, {
        where: {
          conversationId,
          status: In(['queued', 'running', 'awaiting_approval', 'suspended']),
        },
      });
      if (pending > 0) {
        throw new ConflictException(
          'Wait for the current conversation response before sending another message',
        );
      }
      await this.runs.assertQueueCapacity(manager, userId);
      const saved = await manager.save(
        Run,
        manager.create(Run, {
          userId,
          conversationId,
          capability: 'chat',
          context: conversation.context,
          input: content,
          options: conversation.options,
          browserSessionId: request.browserSessionId,
          browserExecutionTarget: request.browserExecutionTarget ?? 'extension',
          executionLane: this.runs.resolveExecutionLane({
            ...request,
            capability: 'chat',
          }),
          status: 'queued',
        }),
      );
      await manager.save(
        ConversationMessage,
        manager.create(ConversationMessage, {
          conversationId,
          runId: saved.id,
          role: 'user',
          content,
        }),
      );
      await manager.update(Conversation, conversationId, {
        updatedAt: new Date(),
      });
      return saved;
    });
    try {
      await this.runs.enqueue(run.id, run.executionLane);
    } catch {
      await this.runs.markQueueFailure(run.id);
      throw new ServiceUnavailableException('Unable to queue assistant run');
    }
    return {
      message: 'Conversation message queued successfully',
      data: this.runs.toResponse(run),
    };
  }

  private async findUserConversation(userId: number, id: string) {
    const conversation = await this.repository.manager.findOne(Conversation, {
      where: { id, userId },
    });
    if (!conversation)
      throw new NotFoundException('Assistant conversation not found');
    return conversation;
  }
}
