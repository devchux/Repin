import {
  AI_ASSISTANT_CAPABILITIES,
  ASSISTANT_RUN_PHASES,
  ASSISTANT_RUN_STATUSES,
} from '@repo/contracts/assistant';
import type {
  AiAssistantCapability,
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
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  AssistantOptionsDto,
  AssistantPageContextDto,
} from '../dto/execute-assistant.dto';
import { User } from '../../user/entities/user.entity';
import { AssistantConversation } from './conversation.entity';
import { AssistantConversationMessage } from './conversation-message.entity';
import { AssistantRunCheckpoint } from './run-checkpoint.entity';
import { AssistantRunEvent } from './run-event.entity';
import { AssistantRunStep } from './run-step.entity';
import { BrowserToolApproval } from '../../tools/policy/browser-tool-approval.entity';
import { AssistantRunContinuation } from './run-continuation.entity';

@Entity('assistant_runs')
@Index(['userId', 'createdAt'])
@Index(['status'])
export class AssistantRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.assistantRuns, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  conversationId?: string;

  @ManyToOne(() => AssistantConversation, (conversation) => conversation.runs, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation?: AssistantConversation;

  @Column({ nullable: true })
  browserSessionId?: string;

  @Column({ default: 'extension' })
  browserExecutionTarget: 'extension' | 'managed';

  @Column({ type: 'enum', enum: AI_ASSISTANT_CAPABILITIES })
  capability: AiAssistantCapability;

  @Column({ type: 'enum', enum: ASSISTANT_RUN_STATUSES, default: 'queued' })
  status: AssistantRunStatus;

  @Column({ type: 'enum', enum: ASSISTANT_RUN_PHASES, default: 'queued' })
  phase: AssistantRunPhase;

  @Column({ type: 'integer', default: 0 })
  checkpointVersion: number;

  @Column({ type: 'integer', default: 0 })
  modelCallCount: number;

  @Column({ type: 'integer', default: 0 })
  toolCallCount: number;

  @Column({ type: 'integer', default: 12 })
  maxModelCalls: number;

  @Column({ type: 'integer', default: 30 })
  maxToolCalls: number;

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

  @Column({ nullable: true })
  queueJobId?: string;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @OneToMany(() => AssistantConversationMessage, (message) => message.run)
  messages: AssistantConversationMessage[];

  @OneToMany(() => AssistantRunStep, (step) => step.run)
  steps: AssistantRunStep[];

  @OneToMany(() => AssistantRunEvent, (event) => event.run)
  events: AssistantRunEvent[];

  @OneToMany(() => AssistantRunCheckpoint, (checkpoint) => checkpoint.run)
  checkpoints: AssistantRunCheckpoint[];

  @OneToMany(() => BrowserToolApproval, (approval) => approval.run)
  approvals: BrowserToolApproval[];

  @OneToOne(() => AssistantRunContinuation, (continuation) => continuation.run)
  continuation?: AssistantRunContinuation;
}
