import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Instance } from './instance.entity';

@Entity('workflow_events')
@Index(['instanceId', 'sequence'], { unique: true })
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  instanceId: string;

  @ManyToOne(() => Instance, (instance) => instance.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'instanceId' })
  instance: Instance;

  @Column({ type: 'integer' })
  sequence: number;

  @Column()
  type: string;

  @Column({ nullable: true })
  nodeId?: string;

  @Column({ type: 'jsonb', nullable: true })
  data?: unknown;

  @CreateDateColumn()
  createdAt: Date;
}
