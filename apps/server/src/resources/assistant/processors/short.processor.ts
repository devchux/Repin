import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { INTERACTIVE_QUEUE, WORKER_CONCURRENCY } from '../constants';
import { RunHandler } from '../services/run-handler.service';
import {
  QueueTelemetryEvents,
  TelemetryAttributes,
  traceOperation,
} from '@repo/observability';

interface AssistantJobData {
  runId: string;
}

@Processor(INTERACTIVE_QUEUE, {
  concurrency: WORKER_CONCURRENCY,
  maxStalledCount: 3,
})
export class ShortProcessor extends WorkerHost {
  constructor(private readonly runHandler: RunHandler) {
    super();
  }

  process(job: Job<AssistantJobData>, token?: string): Promise<void> {
    return traceOperation(
      QueueTelemetryEvents.assistantJob,
      {
        [TelemetryAttributes.messaging.destinationName]: INTERACTIVE_QUEUE,
        [TelemetryAttributes.messaging.operationName]: 'process',
        [TelemetryAttributes.queue.jobId]: String(job.id ?? ''),
        [TelemetryAttributes.run.id]: job.data.runId,
        [TelemetryAttributes.run.executionLane]: 'short',
      },
      () => this.runHandler.process(job, 'short', token),
    );
  }
}
