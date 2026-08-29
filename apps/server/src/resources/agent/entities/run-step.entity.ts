import {
  ASSISTANT_STEP_STATUSES,
  ASSISTANT_STEP_TYPES,
} from '@repo/contracts/assistant';
import type {
  AssistantStepStatus,
  AssistantStepType,
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

@Entity('assistant_run_steps')
@Index(['runId', 'sequence'], { unique: true })
export class RunStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  runId: string;

  @ManyToOne(() => Run, (run) => run.steps, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'runId' })
  run: Run;

  @Column({ type: 'integer' })
  sequence: number;

  @Column({ type: 'enum', enum: ASSISTANT_STEP_TYPES })
  type: AssistantStepType;

  @Column({ type: 'enum', enum: ASSISTANT_STEP_STATUSES })
  status: AssistantStepStatus;

  @Column({ type: 'jsonb', nullable: true })
  input?: unknown;

  @Column({ type: 'jsonb', nullable: true })
  output?: unknown;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'integer', default: 1 })
  attempt: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;
}
