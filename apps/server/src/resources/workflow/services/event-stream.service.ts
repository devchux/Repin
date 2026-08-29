import {
  BadRequestException,
  Injectable,
  NotFoundException,
  type MessageEvent,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import {
  concatMap,
  defer,
  filter,
  from,
  interval,
  map,
  merge,
  Observable,
  share,
  take,
  takeUntil,
  takeWhile,
  timer,
} from 'rxjs';
import { Event } from '../entities/event.entity';
import { Instance } from '../entities/instance.entity';

const TERMINAL_EVENT_TYPES = new Set([
  'workflow.completed',
  'workflow.failed',
  'workflow.cancelled',
]);

@Injectable()
export class EventStreamService {
  constructor(
    @InjectRepository(Instance)
    private readonly instanceRepository: Repository<Instance>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async watch(
    userId: number,
    instanceId: string,
    lastEventId?: string,
  ): Promise<Observable<MessageEvent>> {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId, userId },
    });
    if (!instance) throw new NotFoundException('Workflow instance not found');

    const initialSequence = this.parseLastEventId(lastEventId);
    const events = defer(() => {
      let sequence = initialSequence;
      return timer(0, 1000).pipe(
        concatMap(() =>
          this.eventRepository.find({
            where: { instanceId, sequence: MoreThan(sequence) },
            order: { sequence: 'ASC' },
          }),
        ),
        concatMap((batch) => from(batch)),
        map((event): MessageEvent => {
          sequence = event.sequence;
          return {
            id: String(event.sequence),
            type: event.type,
            retry: 2000,
            data: event,
          };
        }),
        takeWhile((event) => !TERMINAL_EVENT_TYPES.has(event.type), true),
      );
    }).pipe(share());
    const terminalEvent = events.pipe(
      filter((event) => TERMINAL_EVENT_TYPES.has(event.type)),
      take(1),
    );
    const heartbeats = interval(15_000).pipe(
      map(
        (): MessageEvent => ({
          type: 'heartbeat',
          data: { instanceId },
        }),
      ),
      takeUntil(terminalEvent),
    );

    return merge(events, heartbeats);
  }

  private parseLastEventId(lastEventId?: string) {
    if (lastEventId === undefined || lastEventId === '') return 0;
    if (!/^\d+$/.test(lastEventId)) {
      throw new BadRequestException('Last-Event-ID must be a sequence number');
    }
    return Number(lastEventId);
  }
}
