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
import { Run } from './run.entity';

@Entity('assistant_run_checkpoints')
@Index(['runId', 'version'], { unique: true })
export class RunCheckpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  runId: string;

  @ManyToOne(() => Run, (run) => run.checkpoints, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'runId' })
  run: Run;

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
