import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { BACKGROUND_QUEUE, BACKGROUND_WORKER_CONCURRENCY } from '../constants';
import { RunHandler } from '../services/run-handler.service';
import {
  QueueTelemetryEvents,
  TelemetryAttributes,
  traceOperation,
} from '@repo/observability';

interface AssistantJobData {
  runId: string;
}

@Processor(BACKGROUND_QUEUE, {
  concurrency: BACKGROUND_WORKER_CONCURRENCY,
})
export class LongProcessor extends WorkerHost {
  constructor(private readonly runHandler: RunHandler) {
    super();
  }

  process(job: Job<AssistantJobData>, token?: string): Promise<void> {
    return traceOperation(
      QueueTelemetryEvents.assistantJob,
      {
        [TelemetryAttributes.messaging.destinationName]: BACKGROUND_QUEUE,
        [TelemetryAttributes.messaging.operationName]: 'process',
        [TelemetryAttributes.queue.jobId]: String(job.id ?? ''),
        [TelemetryAttributes.run.id]: job.data.runId,
        [TelemetryAttributes.run.executionLane]: 'long',
      },
      () => this.runHandler.process(job, 'long', token),
    );
  }
}
