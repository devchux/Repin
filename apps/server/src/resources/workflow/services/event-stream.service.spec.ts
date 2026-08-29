import { BadRequestException, NotFoundException } from '@nestjs/common';
import { toArray } from 'rxjs';
import { EventStreamService } from './event-stream.service';

describe('EventStreamService', () => {
  const instanceRepository = { findOne: jest.fn() };
  const eventRepository = { find: jest.fn() };
  const service = new EventStreamService(
    instanceRepository as never,
    eventRepository as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('replays ordered events after Last-Event-ID and closes on a terminal event', async () => {
    instanceRepository.findOne.mockResolvedValue({ id: 'instance-1' });
    eventRepository.find.mockResolvedValue([
      {
        id: 'event-3',
        instanceId: 'instance-1',
        sequence: 3,
        type: 'workflow.node_completed',
      },
      {
        id: 'event-4',
        instanceId: 'instance-1',
        sequence: 4,
        type: 'workflow.completed',
      },
    ]);

    const stream = await service.watch(7, 'instance-1', '2');
    const events = await stream.pipe(toArray()).toPromise();

    expect(instanceRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'instance-1', userId: 7 },
    });
    expect(eventRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ order: { sequence: 'ASC' } }),
    );
    expect(events?.map((event) => event.id)).toEqual(['3', '4']);
    expect(events?.map((event) => event.type)).toEqual([
      'workflow.node_completed',
      'workflow.completed',
    ]);
  });

  it('rejects an invalid Last-Event-ID', async () => {
    instanceRepository.findOne.mockResolvedValue({ id: 'instance-1' });

    await expect(
      service.watch(7, 'instance-1', 'event-2'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not expose another user workflow', async () => {
    instanceRepository.findOne.mockResolvedValue(null);

    await expect(service.watch(7, 'instance-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
