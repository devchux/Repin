import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { MemorySourceType, MemoryTrust } from '@repo/contracts/memory';
import { Brackets, Repository } from 'typeorm';
import { CreateMemoryDto } from './dto/create-memory.dto';
import { FindMemoriesDto, FindMemoryContextDto } from './dto/find-memories.dto';
import { Memory } from './entities/memory.entity';

const UNTRUSTED_SOURCES = new Set<MemorySourceType>(['webpage']);

@Injectable()
export class MemoryService {
  constructor(
    @InjectRepository(Memory)
    private readonly memories: Repository<Memory>,
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
    return { message: 'Memory created successfully', data: saved };
  }

  async findAll(userId: number, request: FindMemoriesDto) {
    this.validateOptionalScope(request.scope, request.scopeId);
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
    if (request.query) {
      query.andWhere('memory.content ILIKE :query', {
        query: `%${request.query}%`,
      });
    }

    const data = await query.getMany();
    return { message: 'Memories found successfully', data };
  }

  async findContext(userId: number, request: FindMemoryContextDto) {
    this.validateOptionalScope(request.scope, request.scopeId);
    const data = await this.getContext(userId, request);
    return { message: 'Memory context found successfully', data };
  }

  async getContext(userId: number, request: FindMemoryContextDto) {
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
