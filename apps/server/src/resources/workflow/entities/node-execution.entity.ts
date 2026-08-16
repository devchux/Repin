import {
  WORKFLOW_NODE_STATUSES,
  type WorkflowNodeStatus,
} from '@repo/contracts/workflow';
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
import { Run } from '../../agent/entities/run.entity';
import { Instance } from './instance.entity';

@Entity('workflow_node_executions')
@Index(['instanceId', 'nodeId'], { unique: true })
export class NodeExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  instanceId: string;

  @ManyToOne(() => Instance, (instance) => instance.nodeExecutions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'instanceId' })
  instance: Instance;

  @Column()
  nodeId: string;

  @Column()
  nodeType: string;

  @Column({ type: 'enum', enum: WORKFLOW_NODE_STATUSES, default: 'pending' })
  status: WorkflowNodeStatus;

  @Column({ type: 'uuid', nullable: true })
  runId?: string;

  @ManyToOne(() => Run, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'runId' })
  run?: Run;

  @Column({ type: 'jsonb', nullable: true })
  output?: unknown;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;
}
