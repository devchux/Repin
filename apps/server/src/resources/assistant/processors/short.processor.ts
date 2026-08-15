import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { INTERACTIVE_QUEUE, WORKER_CONCURRENCY } from '../constants';
import { RunHandler } from '../services/run-handler.service';

interface AssistantJobData {
  runId: string;
}

@Processor(INTERACTIVE_QUEUE, {
  concurrency: WORKER_CONCURRENCY,
})
export class ShortProcessor extends WorkerHost {
  constructor(private readonly runHandler: RunHandler) {
    super();
  }

  process(job: Job<AssistantJobData>, token?: string): Promise<void> {
    return this.runHandler.process(job, 'short', token);
  }
}
