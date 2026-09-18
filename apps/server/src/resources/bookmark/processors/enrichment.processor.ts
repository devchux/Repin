import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  BOOKMARK_ENRICHMENT_QUEUE,
  ENRICH_BOOKMARK_JOB,
} from '../utils/constants';
import { BookmarkEnrichmentService } from '../services/enrichment.service';

interface BookmarkEnrichmentJob {
  readonly bookmarkId: string;
}

@Processor(BOOKMARK_ENRICHMENT_QUEUE, { concurrency: 2 })
export class BookmarkEnrichmentProcessor extends WorkerHost {
  constructor(private readonly enrichment: BookmarkEnrichmentService) {
    super();
  }

  async process(job: Job<BookmarkEnrichmentJob>): Promise<void> {
    if (job.name !== ENRICH_BOOKMARK_JOB) return;
    await this.enrichment.enrichById(job.data.bookmarkId);
  }
}
