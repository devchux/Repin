import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  BACKFILL_MEMORY_EMBEDDINGS_JOB,
  MEMORY_EMBEDDING_QUEUE,
} from './memory.constants';

@Injectable()
export class MemoryEmbeddingScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(MEMORY_EMBEDDING_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queue.add(
      BACKFILL_MEMORY_EMBEDDINGS_JOB,
      {},
      {
        jobId: 'memory-embedding-backfill-initial',
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
    await this.queue.add(
      BACKFILL_MEMORY_EMBEDDINGS_JOB,
      {},
      {
        jobId: 'memory-embedding-backfill',
        repeat: { every: 60_000 },
        removeOnComplete: 10,
        removeOnFail: 100,
      },
    );
  }
}
