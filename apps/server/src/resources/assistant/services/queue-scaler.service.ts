import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import type { Configuration } from 'src/shared/types';
import {
  INTERACTIVE_QUEUE,
  WORKER_CONCURRENCY,
  WORKER_MAX_CONCURRENCY,
} from '../constants';
import { ShortProcessor } from '../processors/short.processor';
import { Run } from '../../agent/entities/run.entity';

@Injectable()
export class QueueScaler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(QueueScaler.name);
  private interval?: NodeJS.Timeout;

  constructor(
    @InjectQueue(INTERACTIVE_QUEUE)
    private readonly assistantQueue: Queue,
    @InjectRepository(Run)
    private readonly runRepository: Repository<Run>,
    private readonly shortProcessor: ShortProcessor,
    private readonly configService: ConfigService<Configuration>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.assistantQueue.setGlobalRateLimit(
      this.configService.get('assistantQueue.rateLimitMax', { infer: true }),
      this.configService.get('assistantQueue.rateLimitDuration', {
        infer: true,
      }),
    );
    const interval = this.configService.get(
      'assistantQueue.scaleCheckInterval',
      {
        infer: true,
      },
    );
    this.interval = setInterval(() => void this.scale(), interval);
    this.interval.unref();
  }

  onApplicationShutdown(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async scale(): Promise<void> {
    try {
      const [waiting, delayed, average] = await Promise.all([
        this.assistantQueue.getWaitingCount(),
        this.assistantQueue.getDelayedCount(),
        this.runRepository
          .createQueryBuilder('run')
          .select('COALESCE(AVG(run.queueWaitMs), 0)', 'averageWaitMs')
          .where('run.startedAt >= :since', {
            since: new Date(Date.now() - 5 * 60_000),
          })
          .getRawOne<{ averageWaitMs: string }>(),
      ]);
      const depth = waiting + delayed;
      const averageWaitMs = Number(average?.averageWaitMs || 0);
      const depthThreshold = this.configService.get(
        'assistantQueue.scaleDepthThreshold',
        { infer: true },
      );
      const waitThreshold = this.configService.get(
        'assistantQueue.scaleWaitThreshold',
        { infer: true },
      );
      const targetConcurrency =
        depth >= depthThreshold || averageWaitMs >= waitThreshold
          ? WORKER_MAX_CONCURRENCY
          : WORKER_CONCURRENCY;

      if (this.shortProcessor.worker.concurrency !== targetConcurrency) {
        this.shortProcessor.worker.concurrency = targetConcurrency;
        this.logger.log(
          `Assistant worker concurrency changed to ${targetConcurrency} (depth: ${depth}, average wait: ${Math.round(averageWaitMs)}ms)`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Unable to evaluate assistant queue scaling',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
