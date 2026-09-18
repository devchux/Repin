import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { MemorySourceType, MemoryTrust } from '@repo/contracts/memory';
import { Brackets, Repository } from 'typeorm';
import { CreateMemoryDto } from './dto/create-memory.dto';
import { FindMemoriesDto, FindMemoryContextDto } from './dto/find-memories.dto';
import { Memory } from './entities/memory.entity';
import { MemorySource } from './entities/memory-source.entity';
import { LibraryService } from '../library/library.service';
import { CreateMemoryFromSourceDto } from './dto/create-memory-from-source.dto';
import type { LibraryItemType } from '@repo/contracts/library';
import { AiService } from '../ai/ai.service';
import type { MemoryKind, MemoryScope } from '@repo/contracts/memory';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  EMBED_MEMORY_JOB,
  MEMORY_EMBEDDING_QUEUE,
  MEMORY_RANKING,
} from './memory.constants';
import {
  MemoryTelemetryEvents,
  TelemetryAttributes,
  recordMemoryRetrieval,
  traceOperation,
} from '@repo/observability';
import { ConfigService } from '@nestjs/config';
import type { Configuration } from 'src/shared/types';

const UNTRUSTED_SOURCES = new Set<MemorySourceType>([
  'webpage',
  'highlight',
  'bookmark',
]);

const LIBRARY_MEMORY_SOURCE: Record<LibraryItemType, MemorySourceType> = {
  note: 'note',
  highlight: 'highlight',
  bookmark: 'bookmark',
  page: 'webpage',
};

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    @InjectRepository(Memory)
    private readonly memories: Repository<Memory>,
    @InjectRepository(MemorySource)
    private readonly sources: Repository<MemorySource>,
    private readonly library: LibraryService,
    private readonly ai: AiService,
    @Optional()
    @InjectQueue(MEMORY_EMBEDDING_QUEUE)
    private readonly embeddingQueue?: Queue,
    @Optional()
    private readonly config?: ConfigService<Configuration>,
  ) {}

  async create(userId: number, request: CreateMemoryDto) {
    const scope = request.scope ?? 'global';
    this.validateScope(scope, request.scopeId);
    const source = request.source ?? { type: 'explicit_user' as const };
    const memory = this.memories.create({
      userId,
      kind: request.kind ?? 'user',
      content: request.content.trim(),
      scope,
      scopeId: scope === 'global' ? undefined : request.scopeId,
      sources: [
        {
          type: source.type,
          sourceId: source.sourceId,
          url: source.url,
          observedAt: source.observedAt ?? new Date(),
          trust: this.trustFor(source.type),
        },
      ],
    });
    const saved = await this.memories.save(memory);
    await this.queueEmbedding(saved.id);
    return { message: 'Memory created successfully', data: saved };
  }

  async findAll(userId: number, request: FindMemoriesDto) {
    this.validateOptionalScope(request.scope, request.scopeId);
    if (request.query) {
      const data = await this.retrieve(userId, {
        query: request.query,
        kind: request.kind,
        scope: request.scope,
        scopeId: request.scopeId,
        includeGlobal: false,
        limit: request.limit ?? 20,
      });
      return { message: 'Memories found successfully', data };
    }
    const query = this.memories
      .createQueryBuilder('memory')
      .leftJoinAndSelect('memory.sources', 'source')
      .where('memory.userId = :userId', { userId })
      .orderBy('memory.updatedAt', 'DESC')
      .take(request.limit ?? 20);

    if (request.kind)
      query.andWhere('memory.kind = :kind', { kind: request.kind });
    if (request.scope)
      query.andWhere('memory.scope = :scope', { scope: request.scope });
    if (request.scopeId)
      query.andWhere('memory.scopeId = :scopeId', { scopeId: request.scopeId });
    const data = await query.getMany();
    return { message: 'Memories found successfully', data };
  }

  async createFromSource(userId: number, request: CreateMemoryFromSourceDto) {
    const item = await this.library.findOwned(userId, request.sourceId);
    const content = request.content.trim();
    const sourceType = LIBRARY_MEMORY_SOURCE[item.type];
    const duplicate = await this.sources
      .createQueryBuilder('source')
      .innerJoin('source.memory', 'memory')
      .where('memory.userId = :userId', { userId })
      .andWhere('source.type = :sourceType', { sourceType })
      .andWhere('source.sourceId = :sourceId', { sourceId: item.id })
      .andWhere('LOWER(TRIM(memory.content)) = LOWER(:content)', { content })
      .getOne();
    if (duplicate) {
      throw new ConflictException(
        'This source has already created that memory',
      );
    }

    return this.create(userId, {
      content,
      kind: request.kind,
      scope: request.scope,
      scopeId: request.scopeId,
      source: {
        type: sourceType,
        sourceId: item.id,
        url: item.url,
      },
    });
  }

  async findContext(userId: number, request: FindMemoryContextDto) {
    this.validateOptionalScope(request.scope, request.scopeId);
    const data = await this.getContext(userId, request);
    return { message: 'Memory context found successfully', data };
  }

  async getContext(userId: number, request: FindMemoryContextDto) {
    if (request.query) {
      return this.retrieve(userId, {
        query: request.query,
        kind: request.kind,
        scope: request.scope,
        scopeId: request.scopeId,
        includeGlobal: true,
        limit: request.limit ?? 10,
      });
    }
    const query = this.memories
      .createQueryBuilder('memory')
      .leftJoinAndSelect('memory.sources', 'source')
      .where('memory.userId = :userId', { userId })
      .andWhere(
        new Brackets((scopeQuery) => {
          scopeQuery.where('memory.scope = :globalScope', {
            globalScope: 'global',
          });
          if (request.scope && request.scopeId) {
            scopeQuery.orWhere(
              '(memory.scope = :scope AND memory.scopeId = :scopeId)',
              { scope: request.scope, scopeId: request.scopeId },
            );
          }
        }),
      )
      .orderBy('memory.updatedAt', 'DESC')
      .take(request.limit ?? 10);

    return query.getMany();
  }

  private async queueEmbedding(id: string): Promise<void> {
    if (!this.embeddingQueue) return;
    try {
      await this.embeddingQueue.add(
        EMBED_MEMORY_JOB,
        { memoryId: id },
        {
          jobId: `memory:${id}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.memories.update(id, {
        embeddingStatus: 'failed',
        embeddingError: `Queue unavailable: ${message}`.slice(0, 2000),
      });
      this.logger.warn(
        `Memory ${id} embedding could not be queued: ${message}`,
      );
    }
  }

  private async retrieve(
    userId: number,
    request: {
      readonly query: string;
      readonly kind?: MemoryKind;
      readonly scope?: MemoryScope;
      readonly scopeId?: string;
      readonly includeGlobal: boolean;
      readonly limit: number;
    },
  ): Promise<Memory[]> {
    return traceOperation(
      MemoryTelemetryEvents.retrieval,
      {
        [TelemetryAttributes.memory.queryLength]: request.query.length,
        [TelemetryAttributes.memory.scope]: request.scope ?? 'all',
      },
      () => this.retrieveInternal(userId, request),
    );
  }

  private async retrieveInternal(
    userId: number,
    request: {
      readonly query: string;
      readonly kind?: MemoryKind;
      readonly scope?: MemoryScope;
      readonly scopeId?: string;
      readonly includeGlobal: boolean;
      readonly limit: number;
    },
  ): Promise<Memory[]> {
    const ranking =
      this.config?.get('memoryRetrieval', { infer: true }) ?? MEMORY_RANKING;
    let embedding: readonly number[] | undefined;
    try {
      [embedding] = await this.ai.embed([request.query]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Semantic memory retrieval unavailable: ${message}`);
    }

    const parameters: unknown[] = [userId, request.query];
    const conditions = ['memory."userId" = $1'];
    if (request.kind) {
      parameters.push(request.kind);
      conditions.push(`memory."kind" = $${parameters.length}`);
    }
    if (request.scope) {
      parameters.push(request.scope, request.scopeId ?? null);
      const scopeParameter = parameters.length - 1;
      const scopeIdParameter = parameters.length;
      conditions.push(
        request.includeGlobal
          ? `(memory."scope" = 'global' OR (memory."scope" = $${scopeParameter} AND memory."scopeId" = $${scopeIdParameter}))`
          : `memory."scope" = $${scopeParameter} AND memory."scopeId" IS NOT DISTINCT FROM $${scopeIdParameter}`,
      );
    } else if (request.includeGlobal) {
      conditions.push(`memory."scope" = 'global'`);
    }

    const lexical = `to_tsvector('simple', coalesce(memory."content", ''))`;
    const lexicalScore = `ts_rank_cd(${lexical}, websearch_to_tsquery('simple', $2), 32)`;
    const semanticScore = embedding
      ? `GREATEST(0, 1 - (memory."embedding" <=> $${parameters.length + 1}::vector))`
      : '0';
    if (embedding) parameters.push(`[${embedding.join(',')}]`);
    parameters.push(request.scope ?? null, request.scopeId ?? null);
    const rankingScopeParameter = parameters.length - 1;
    const rankingScopeIdParameter = parameters.length;
    parameters.push(request.limit);
    const limitParameter = parameters.length;

    const rows = (await this.memories.query(
      `SELECT memory."id",
        (${lexicalScore} * ${ranking.lexicalWeight}
          + ${semanticScore} * ${ranking.semanticWeight}
          + CASE
              WHEN memory."scope" = $${rankingScopeParameter} AND memory."scopeId" IS NOT DISTINCT FROM $${rankingScopeIdParameter} THEN ${ranking.exactScopeBoost}
              WHEN memory."scope" = 'global' THEN ${ranking.globalScopeBoost}
              ELSE 0
            END
          + (1.0 / (1.0 + EXTRACT(EPOCH FROM (now() - memory."updatedAt")) / 2592000.0)) * ${ranking.recencyWeight}
        ) AS "relevanceScore"
       FROM "memories" memory
       WHERE ${conditions.join(' AND ')}
         AND (${lexical} @@ websearch_to_tsquery('simple', $2)${embedding ? ` OR ${semanticScore} >= ${ranking.minimumSemanticSimilarity}` : ''})
       ORDER BY "relevanceScore" DESC, memory."updatedAt" DESC
       LIMIT $${limitParameter}`,
      parameters,
    )) as Array<{ id: string; relevanceScore: string }>;
    recordMemoryRetrieval(embedding ? 'hybrid' : 'full_text', rows.length);
    if (!rows.length) return [];

    const memories = await this.memories
      .createQueryBuilder('memory')
      .leftJoinAndSelect('memory.sources', 'source')
      .whereInIds(rows.map((row) => row.id))
      .andWhere('memory.userId = :userId', { userId })
      .getMany();
    const byId = new Map(memories.map((memory) => [memory.id, memory]));
    return rows.flatMap((row) => {
      const memory = byId.get(row.id);
      if (!memory) return [];
      memory.relevanceScore = Number(row.relevanceScore);
      return [memory];
    });
  }

  async forget(userId: number, id: string) {
    const result = await this.memories.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Memory not found');
    return { message: 'Memory forgotten successfully' };
  }

  private trustFor(type: MemorySourceType): MemoryTrust {
    return UNTRUSTED_SOURCES.has(type) ? 'untrusted' : 'trusted';
  }

  private validateOptionalScope(scope?: string, scopeId?: string) {
    if (!scope && scopeId) {
      throw new BadRequestException('scope is required when scopeId is set');
    }
    if (scope) this.validateScope(scope, scopeId);
  }

  private validateScope(scope: string, scopeId?: string) {
    if (scope === 'global' && scopeId) {
      throw new BadRequestException('Global memories cannot have a scopeId');
    }
    if (scope !== 'global' && !scopeId) {
      throw new BadRequestException(`${scope} memories require a scopeId`);
    }
  }
}
