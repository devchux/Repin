import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AiService } from '../../ai/ai.service';
import { Memory } from '../entities/memory.entity';

@Injectable()
export class MemoryEmbeddingService {
  constructor(
    @InjectRepository(Memory)
    private readonly memories: Repository<Memory>,
    private readonly ai: AiService,
  ) {}

  async embedById(memoryId: string): Promise<void> {
    const memory = await this.memories.findOneByOrFail({ id: memoryId });
    await this.memories.update(memoryId, {
      embeddingStatus: 'processing',
      embeddingError: null,
    });
    try {
      const [embedding] = await this.ai.embed([memory.content]);
      if (!embedding) throw new Error('Embedding provider returned no result');
      await this.memories.update(memoryId, {
        embedding: [...embedding],
        embeddingStatus: 'complete',
        embeddingError: null,
        embeddedAt: new Date(),
      });
    } catch (error) {
      await this.memories.update(memoryId, {
        embeddingStatus: 'failed',
        embeddingError:
          error instanceof Error
            ? error.message.slice(0, 2000)
            : 'Embedding failed',
      });
      throw error;
    }
  }

  async findBackfillIds(limit = 100): Promise<string[]> {
    const memories = await this.memories.find({
      select: { id: true },
      where: { embedding: IsNull() },
      order: { createdAt: 'ASC' },
      take: limit,
    });
    return memories.map((memory) => memory.id);
  }
}
