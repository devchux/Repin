import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import {
  BACKFILL_MEMORY_EMBEDDINGS_JOB,
  EMBED_MEMORY_JOB,
  MEMORY_EMBEDDING_QUEUE,
} from '../constants';
import { MemoryEmbeddingService } from '../services/embedding.service';

interface MemoryEmbeddingJob {
  readonly memoryId: string;
}

@Processor(MEMORY_EMBEDDING_QUEUE, { concurrency: 2 })
export class MemoryEmbeddingProcessor extends WorkerHost {
  constructor(
    private readonly embeddings: MemoryEmbeddingService,
    @InjectQueue(MEMORY_EMBEDDING_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job<MemoryEmbeddingJob>): Promise<void> {
    if (job.name === EMBED_MEMORY_JOB) {
      await this.embeddings.embedById(job.data.memoryId);
      return;
    }
    if (job.name !== BACKFILL_MEMORY_EMBEDDINGS_JOB) return;
    const ids = await this.embeddings.findBackfillIds();
    await Promise.all(ids.map((id) => this.enqueue(id)));
  }

  private async enqueue(memoryId: string): Promise<void> {
    const jobId = `memory:${memoryId}`;
    const existing = await this.queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'failed') await existing.remove();
      else return;
    }
    await this.queue.add(
      EMBED_MEMORY_JOB,
      { memoryId },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
  }
}
