import {
  AI_ASSISTANT_CAPABILITIES,
  ASSISTANT_RUN_STATUSES,
} from '@repo/contracts/assistant';
import type {
  AiAssistantCapability,
  AssistantRunStatus,
} from '@repo/contracts/assistant';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  AssistantOptionsDto,
  AssistantPageContextDto,
} from '../dto/execute-assistant.dto';

@Entity('assistant_runs')
@Index(['userId', 'createdAt'])
@Index(['status'])
export class AssistantRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @Column({ type: 'uuid', nullable: true })
  conversationId?: string;

  @Column({ type: 'enum', enum: AI_ASSISTANT_CAPABILITIES })
  capability: AiAssistantCapability;

  @Column({ type: 'enum', enum: ASSISTANT_RUN_STATUSES, default: 'queued' })
  status: AssistantRunStatus;

  @Column({ type: 'jsonb' })
  context: AssistantPageContextDto;

  @Column({ type: 'text', nullable: true })
  input?: string;

  @Column({ type: 'jsonb', nullable: true })
  options?: AssistantOptionsDto;

  @Column({ type: 'text', nullable: true })
  result?: string;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ nullable: true })
  provider?: string;

  @Column({ nullable: true })
  model?: string;

  @Column({ type: 'integer', nullable: true })
  inputTokens?: number;

  @Column({ type: 'integer', nullable: true })
  outputTokens?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'integer', nullable: true })
  queueWaitMs?: number;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;
}
