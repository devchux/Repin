import type {
  WorkflowActivation,
  WorkflowDefinitionSource,
  WorkflowGoal,
  WorkflowGraph,
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
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Instance } from './instance.entity';

@Entity('workflow_definitions')
@Index(['userId', 'key', 'version'], { unique: true })
export class Definition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.workflowDefinitions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  key: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  activation?: WorkflowActivation;

  @Column({ default: 'manual' })
  source: WorkflowDefinitionSource;

  @Column({ type: 'jsonb', nullable: true })
  goal?: WorkflowGoal;

  @Column({ type: 'integer' })
  version: number;

  @Column({ type: 'jsonb' })
  graph: WorkflowGraph;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Instance, (instance) => instance.definition)
  instances: Instance[];
}
