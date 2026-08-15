import type {
  AssistantRunPhase,
  AssistantRunStatus,
} from '@repo/contracts/assistant';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AssistantRun } from './run.entity';

@Entity('assistant_run_checkpoints')
@Index(['runId', 'version'], { unique: true })
export class AssistantRunCheckpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  runId: string;

  @ManyToOne(() => AssistantRun, (run) => run.checkpoints, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'runId' })
  run: AssistantRun;

  @Column({ type: 'integer' })
  version: number;

  @Column()
  status: AssistantRunStatus;

  @Column()
  phase: AssistantRunPhase;

  @Column({ type: 'jsonb', nullable: true })
  state?: Readonly<Record<string, unknown>>;

  @CreateDateColumn()
  createdAt: Date;
}
