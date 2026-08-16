import { Processor, WorkerHost } from '@nestjs/bullmq';
import { DelayedError, type Job } from 'bullmq';
import { QUEUE, WORKER_CONCURRENCY } from '../constants';
import { RuntimeService } from '../services/runtime.service';

@Processor(QUEUE, { concurrency: WORKER_CONCURRENCY })
export class RuntimeProcessor extends WorkerHost {
  constructor(private readonly runtime: RuntimeService) {
    super();
  }

  async process(
    job: Job<{ instanceId: string }>,
    token?: string,
  ): Promise<void> {
    try {
      await this.runtime.execute(job, token);
    } catch (error) {
      if (error instanceof DelayedError) throw error;
      const finalAttempt = job.attemptsMade + 1 >= (job.opts.attempts || 1);
      if (finalAttempt) {
        await this.runtime.recordTerminalFailure(
          job.data.instanceId,
          error instanceof Error ? error.message : 'Unknown workflow error',
        );
      }
      throw error;
    }
  }
}
