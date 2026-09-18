import type { MemorySourceType, MemoryTrust } from '@repo/contracts/memory';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Memory } from './memory.entity';

@Entity('memory_sources')
@Index(['memoryId', 'createdAt'])
export class MemorySource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  memoryId: string;

  @ManyToOne(() => Memory, (memory) => memory.sources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'memoryId' })
  memory: Memory;

  @Column({ type: 'varchar' })
  type: MemorySourceType;

  @Column({ type: 'varchar', nullable: true })
  sourceId?: string;

  @Column({ type: 'text', nullable: true })
  url?: string;

  @Column({ type: 'varchar' })
  trust: MemoryTrust;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  observedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
