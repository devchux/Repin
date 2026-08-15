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

@Entity('assistant_run_events')
@Index(['runId', 'sequence'], { unique: true })
export class AssistantRunEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  runId: string;

  @ManyToOne(() => AssistantRun, (run) => run.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'runId' })
  run: AssistantRun;

  @Column({ type: 'integer' })
  sequence: number;

  @Column()
  type: string;

  @Column({ type: 'jsonb' })
  data: Readonly<Record<string, unknown>>;

  @CreateDateColumn()
  createdAt: Date;
}
