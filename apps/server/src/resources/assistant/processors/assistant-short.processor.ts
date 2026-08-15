import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  ASSISTANT_INTERACTIVE_QUEUE,
  ASSISTANT_WORKER_CONCURRENCY,
} from '../assistant.constants';
import { AssistantRunHandler } from '../services/assistant-run-handler.service';

interface AssistantJobData {
  runId: string;
}

@Processor(ASSISTANT_INTERACTIVE_QUEUE, {
  concurrency: ASSISTANT_WORKER_CONCURRENCY,
})
export class AssistantShortProcessor extends WorkerHost {
  constructor(private readonly runHandler: AssistantRunHandler) {
    super();
  }

  process(job: Job<AssistantJobData>, token?: string): Promise<void> {
    return this.runHandler.process(job, 'short', token);
  }
}
