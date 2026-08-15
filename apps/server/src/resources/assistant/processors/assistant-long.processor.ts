import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  ASSISTANT_BACKGROUND_QUEUE,
  ASSISTANT_BACKGROUND_WORKER_CONCURRENCY,
} from '../assistant.constants';
import { AssistantRunHandler } from '../services/assistant-run-handler.service';

interface AssistantJobData {
  runId: string;
}

@Processor(ASSISTANT_BACKGROUND_QUEUE, {
  concurrency: ASSISTANT_BACKGROUND_WORKER_CONCURRENCY,
})
export class AssistantLongProcessor extends WorkerHost {
  constructor(private readonly runHandler: AssistantRunHandler) {
    super();
  }

  process(job: Job<AssistantJobData>, token?: string): Promise<void> {
    return this.runHandler.process(job, 'long', token);
  }
}
