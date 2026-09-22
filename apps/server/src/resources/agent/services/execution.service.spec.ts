import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import type { Configuration } from '../../../shared/types';
import type { Run } from '../entities/run.entity';
import type { RunStep } from '../entities/run-step.entity';
import type { RunLiveEventService } from './run-live-event.service';
import { ExecutionService, LoopDetectedError } from './execution.service';

const toolStep = (output: unknown, sequence: number): RunStep =>
  ({
    sequence,
    type: 'tool',
    status: 'completed',
    input: {
      toolCallId: `call-${sequence}`,
      name: 'browser_get_snapshot',
      arguments: { tabId: 'tab-1' },
    },
    output,
  }) as RunStep;

describe('ExecutionService tool progress detection', () => {
  const find = jest.fn();
  const repository = {
    manager: { find },
  } as unknown as Repository<Run>;
  const liveEvents = {} as RunLiveEventService;
  const config = {
    get: jest.fn().mockReturnValue(3),
  } as unknown as ConfigService<Configuration>;
  const service = new ExecutionService(repository, liveEvents, config);

  beforeEach(() => jest.clearAllMocks());

  it('detects repeated actions only when their results also show no progress', async () => {
    find.mockResolvedValue([
      toolStep({ revision: 'same' }, 3),
      toolStep({ revision: 'same' }, 2),
      toolStep({ revision: 'same' }, 1),
    ]);

    await expect(
      service.assertToolResultProgress('run-1'),
    ).rejects.toBeInstanceOf(LoopDetectedError);
  });

  it('allows a repeated observation when its result changes', async () => {
    find.mockResolvedValue([
      toolStep({ revision: 'third' }, 3),
      toolStep({ revision: 'second' }, 2),
      toolStep({ revision: 'first' }, 1),
    ]);

    await expect(
      service.assertToolResultProgress('run-1'),
    ).resolves.toBeUndefined();
  });
});
