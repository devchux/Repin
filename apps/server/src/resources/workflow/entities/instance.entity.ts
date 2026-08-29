import {
  WORKFLOW_INSTANCE_STATUSES,
  type WorkflowInstanceStatus,
  type WorkflowGoalValidation,
} from '@repo/contracts/workflow';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Definition } from './definition.entity';
import { Event } from './event.entity';
import { NodeExecution } from './node-execution.entity';

@Entity('workflow_instances')
@Index(['userId', 'createdAt'])
@Index(['status'])
export class Instance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.workflowInstances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  definitionId: string;

  @ManyToOne(() => Definition, (definition) => definition.instances, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'definitionId' })
  definition: Definition;

  @Column({ type: 'enum', enum: WORKFLOW_INSTANCE_STATUSES, default: 'queued' })
  status: WorkflowInstanceStatus;

  @Column()
  currentNodeId: string;

  @Column({ type: 'jsonb', default: {} })
  input: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  output: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  goalValidation?: WorkflowGoalValidation;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'integer', default: 0 })
  eventSequence: number;

  @Column({ nullable: true })
  queueJobId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @OneToMany(() => NodeExecution, (execution) => execution.instance)
  nodeExecutions: NodeExecution[];

  @OneToMany(() => Event, (event) => event.instance)
  events: Event[];
}
