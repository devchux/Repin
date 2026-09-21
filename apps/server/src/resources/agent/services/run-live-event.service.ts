import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface RunLiveEvent {
  readonly type: string;
  readonly data: Readonly<Record<string, unknown>>;
}

@Injectable()
export class RunLiveEventService {
  private readonly streams = new Map<string, Subject<RunLiveEvent>>();

  publish(runId: string, event: RunLiveEvent): void {
    this.subjectFor(runId).next(event);
  }

  watch(runId: string): Observable<RunLiveEvent> {
    return this.subjectFor(runId).asObservable();
  }

  close(runId: string): void {
    const stream = this.streams.get(runId);
    stream?.complete();
    this.streams.delete(runId);
  }

  private subjectFor(runId: string): Subject<RunLiveEvent> {
    const existing = this.streams.get(runId);
    if (existing) return existing;
    const created = new Subject<RunLiveEvent>();
    this.streams.set(runId, created);
    return created;
  }
}
