import { AssistantRun } from '../../assistant/entities/run.entity';
import { User } from '../../user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { BrowserToolName } from '../types/browser-tool.types';

export type BrowserToolApprovalStatus =
  | 'pending'
  | 'approved'
  | 'consumed'
  | 'denied'
  | 'expired';

@Entity('browser_tool_approvals')
@Index(['runId', 'actionFingerprint'], {
  unique: true,
  where: `"status" IN ('pending', 'approved')`,
})
@Index(['userId', 'status'])
export class BrowserToolApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  runId: string;

  @ManyToOne(() => AssistantRun, (run) => run.approvals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'runId' })
  run: AssistantRun;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.browserToolApprovals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  toolName: BrowserToolName;

  @Column({ type: 'jsonb' })
  arguments: Readonly<Record<string, unknown>>;

  @Column()
  actionFingerprint: string;

  @Column()
  effect: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ default: 'pending' })
  status: BrowserToolApprovalStatus;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  decidedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  consumedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
