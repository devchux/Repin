import {
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
import { ConversationMessage } from '../entities/conversation-message.entity';
import { Conversation } from '../entities/conversation.entity';
import { RunService } from './run.service';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Run) private readonly repository: Repository<Run>,
    private readonly runs: RunService,
  ) {}

  async createRun(
    userId: number,
    request: ExecuteDto,
    idempotencyKey?: string,
  ) {
    this.runs.validateRequest(request);
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
          context: request.context,
          options: request.options,
        }),
      );
      const saved = await manager.save(
        Run,
        manager.create(Run, {
          userId,
          conversationId: conversation.id,
          capability: request.capability,
          context: request.context,
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

  async findConversation(userId: number, conversationId: string) {
    const conversation = await this.findUserConversation(
      userId,
      conversationId,
    );
    const messages = await this.repository.manager.find(ConversationMessage, {
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
    return {
      message: 'Assistant conversation found successfully',
      data: {
        id: conversation.id,
        initialCapability: conversation.initialCapability,
        context: conversation.context,
        messages: messages.map((message) => ({
          id: message.id,
          runId: message.runId,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
        })),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    };
  }

  async findConversations(userId: number) {
    const conversations = await this.repository.manager.find(Conversation, {
      where: { userId },
      relations: { messages: true },
      order: { updatedAt: 'DESC', messages: { createdAt: 'ASC' } },
      take: 50,
    });

    return {
      message: 'Assistant conversations found successfully',
      data: conversations.map((conversation) => {
        const firstUserMessage = conversation.messages.find(
          (message) => message.role === 'user',
        );
        const lastMessage = conversation.messages.at(-1);
        const fallbackTitle = conversation.context.title || 'New conversation';

        return {
          id: conversation.id,
          initialCapability: conversation.initialCapability,
          title: this.truncate(firstUserMessage?.content || fallbackTitle, 80),
          preview: this.truncate(lastMessage?.content || fallbackTitle, 180),
          messageCount: conversation.messages.length,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        };
      }),
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

  private truncate(value: string, length: number) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length > length
      ? `${normalized.slice(0, length - 1).trimEnd()}…`
      : normalized;
  }
}
