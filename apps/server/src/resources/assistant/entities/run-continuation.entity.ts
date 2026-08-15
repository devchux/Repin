import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AssistantRun } from './run.entity';

export type ContinuationReason =
  | 'prepared'
  | 'approval'
  | 'browser_unavailable';
export type ContinuationDispatchState = 'prepared' | 'unknown';

@Entity('assistant_run_continuations')
export class AssistantRunContinuation {
  @PrimaryColumn({ type: 'uuid' })
  runId: string;

  @OneToOne(() => AssistantRun, (run) => run.continuation, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'runId' })
  run: AssistantRun;

  @Column({ type: 'integer' })
  iteration: number;

  @Column({ type: 'jsonb' })
  messages: readonly unknown[];

  @Column({ type: 'jsonb' })
  pendingToolCalls: readonly unknown[];

  @Column({ type: 'uuid' })
  idempotencyKey: string;

  @Column({ default: 'prepared' })
  reason: ContinuationReason;

  @Column({ default: 'prepared' })
  dispatchState: ContinuationDispatchState;

  @UpdateDateColumn()
  updatedAt: Date;
}
