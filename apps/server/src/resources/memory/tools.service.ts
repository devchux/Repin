import { BadRequestException, Injectable } from '@nestjs/common';
import type { AiTool } from '../ai/types/provider';
import type { MemoryKind, MemoryScope } from '@repo/contracts/memory';
import { MemoryService } from './memory.service';

export const MEMORY_TOOL_NAMES = [
  'memory_remember',
  'memory_search',
  'memory_forget',
] as const;

export type MemoryToolName = (typeof MEMORY_TOOL_NAMES)[number];

export interface MemoryToolCall {
  readonly name: MemoryToolName;
  readonly arguments: Readonly<Record<string, unknown>>;
}

export interface MemoryToolContext {
  readonly userId: number;
  readonly runId: string;
  readonly userInput?: string;
  readonly currentUrl?: string;
  readonly currentDomain?: string;
}

const MEMORY_TOOL_DEFINITIONS: readonly AiTool[] = [
  {
    name: 'memory_remember',
    description:
      'Save durable memory only when the current user explicitly asks Repin to remember or save something for later.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['content'],
      properties: {
        content: { type: 'string', maxLength: 4000 },
        kind: { type: 'string', enum: ['user', 'agent'] },
        scope: {
          type: 'string',
          enum: ['global', 'project', 'domain', 'conversation'],
        },
        scopeId: { type: 'string', maxLength: 500 },
        sourceType: {
          type: 'string',
          enum: ['explicit_user', 'webpage'],
          description:
            'Use webpage only when the remembered fact comes from the current page.',
        },
      },
    },
  },
  {
    name: 'memory_search',
    description:
      'Search the authenticated user’s durable memories when recalled context is needed.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: { type: 'string', maxLength: 200 },
        scope: {
          type: 'string',
          enum: ['global', 'project', 'domain', 'conversation'],
        },
        scopeId: { type: 'string', maxLength: 500 },
        limit: { type: 'integer', minimum: 1, maximum: 10 },
      },
    },
  },
  {
    name: 'memory_forget',
    description:
      'Permanently delete one memory only when the current user explicitly asks Repin to forget or delete it. Use memory_search first to obtain its ID.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      properties: {
        id: { type: 'string', format: 'uuid' },
      },
    },
  },
];

@Injectable()
export class MemoryToolsService {
  constructor(private readonly memories: MemoryService) {}

  getDefinitions(): readonly AiTool[] {
    return MEMORY_TOOL_DEFINITIONS;
  }

  supports(name: string): name is MemoryToolName {
    return (MEMORY_TOOL_NAMES as readonly string[]).includes(name);
  }

  async execute(call: MemoryToolCall, context: MemoryToolContext) {
    switch (call.name) {
      case 'memory_remember': {
        this.requireExplicitIntent(context.userInput, 'remember');
        const scope = this.readScope(call.arguments.scope);
        const scopeId = this.readOptionalString(call.arguments.scopeId);
        const sourceType = this.readSourceType(call.arguments.sourceType);
        return this.memories.create(context.userId, {
          content: this.readRequiredString(call.arguments.content, 'content'),
          kind: this.readKind(call.arguments.kind),
          scope,
          scopeId:
            scope === 'domain' && !scopeId ? context.currentDomain : scopeId,
          source: {
            type: sourceType,
            url: sourceType === 'webpage' ? context.currentUrl : undefined,
          },
        });
      }
      case 'memory_search':
        return this.memories.findAll(context.userId, {
          query: this.readOptionalString(call.arguments.query),
          scope: this.readScope(call.arguments.scope),
          scopeId:
            this.readScope(call.arguments.scope) === 'domain' &&
            !this.readOptionalString(call.arguments.scopeId)
              ? context.currentDomain
              : this.readOptionalString(call.arguments.scopeId),
          limit: this.readLimit(call.arguments.limit),
        });
      case 'memory_forget':
        this.requireExplicitIntent(context.userInput, 'forget');
        return this.memories.forget(
          context.userId,
          this.readUuid(call.arguments.id),
        );
    }
  }

  private requireExplicitIntent(
    userInput: string | undefined,
    operation: 'remember' | 'forget',
  ) {
    const pattern =
      operation === 'remember'
        ? /\bremember\b|\b(save|store)\b.{0,40}\b(memory|for later|preference|this|that)\b/i
        : /\bforget\b|\b(delete|remove)\b.{0,40}\b(memory|preference|what you know)\b/i;
    if (!userInput || !pattern.test(userInput)) {
      throw new BadRequestException(
        `memory_${operation} requires an explicit request in the current user message`,
      );
    }
  }

  private readRequiredString(value: unknown, name: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${name} must be a non-empty string`);
    }
    return value.trim();
  }

  private readOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private readKind(value: unknown): MemoryKind {
    if (value === undefined) return 'user';
    if (value === 'user' || value === 'agent') return value;
    throw new BadRequestException('kind must be user or agent');
  }

  private readScope(value: unknown): MemoryScope | undefined {
    if (value === undefined) return undefined;
    if (
      ['global', 'project', 'domain', 'conversation'].includes(String(value))
    ) {
      return value as MemoryScope;
    }
    throw new BadRequestException('Invalid memory scope');
  }

  private readLimit(value: unknown): number {
    if (value === undefined) return 10;
    if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 10) {
      throw new BadRequestException('limit must be an integer from 1 to 10');
    }
    return Number(value);
  }

  private readSourceType(value: unknown): 'explicit_user' | 'webpage' {
    if (value === undefined || value === 'explicit_user')
      return 'explicit_user';
    if (value === 'webpage') return value;
    throw new BadRequestException(
      'sourceType must be explicit_user or webpage',
    );
  }

  private readUuid(value: unknown): string {
    const id = this.readRequiredString(value, 'id');
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      throw new BadRequestException('id must be a UUID');
    }
    return id;
  }
}
