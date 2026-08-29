import type { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import type { Repository } from 'typeorm';
import type { Configuration } from 'src/shared/types';
import { QueueScaler } from './queue-scaler.service';
import type { ShortProcessor } from '../processors/short.processor';
import type { Run } from '../../agent/entities/run.entity';

describe('QueueScaler', () => {
  const queue = {
    getWaitingCount: jest.fn(),
    getDelayedCount: jest.fn(),
    setGlobalRateLimit: jest.fn(),
  } as unknown as Queue;
  const queryBuilder = {
    select: jest.fn(),
    where: jest.fn(),
    getRawOne: jest.fn(),
  };
  const runRepository = {
    createQueryBuilder: jest.fn(),
  } as unknown as Repository<Run>;
  const worker = { concurrency: 5 };
  const processor = { worker } as unknown as ShortProcessor;
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, number> = {
        'assistantQueue.rateLimitMax': 25,
        'assistantQueue.rateLimitDuration': 60_000,
        'assistantQueue.scaleCheckInterval': 15_000,
        'assistantQueue.scaleDepthThreshold': 20,
        'assistantQueue.scaleWaitThreshold': 5_000,
      };
      return values[key];
    }),
  } as unknown as ConfigService<Configuration>;
  const scaler = new QueueScaler(queue, runRepository, processor, config);

  beforeEach(() => {
    jest.clearAllMocks();
    worker.concurrency = 5;
    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.where.mockReturnValue(queryBuilder);
    queryBuilder.getRawOne.mockResolvedValue({ averageWaitMs: '1000' });
    jest
      .spyOn(runRepository, 'createQueryBuilder')
      .mockReturnValue(queryBuilder as never);
    jest.spyOn(queue, 'getWaitingCount').mockResolvedValue(0);
    jest.spyOn(queue, 'getDelayedCount').mockResolvedValue(0);
  });

  it('raises local concurrency when queue depth reaches the threshold', async () => {
    jest.spyOn(queue, 'getWaitingCount').mockResolvedValue(20);

    await scaler.scale();

    expect(worker.concurrency).toBe(10);
  });

  it('configures a Redis-backed global provider rate limit', async () => {
    jest.spyOn(queue, 'setGlobalRateLimit').mockResolvedValue(1);

    await scaler.onApplicationBootstrap();
    scaler.onApplicationShutdown();

    expect(queue.setGlobalRateLimit).toHaveBeenCalledWith(25, 60_000);
  });

  it('restores base concurrency after pressure recovers', async () => {
    worker.concurrency = 10;

    await scaler.scale();

    expect(worker.concurrency).toBe(5);
  });
});
