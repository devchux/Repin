import type { MemoryKind, MemoryScope } from '@repo/contracts/memory';
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
import { MemorySource } from './memory-source.entity';

@Entity('memories')
@Index(['userId', 'scope', 'scopeId', 'updatedAt'])
export class Memory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.memories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar' })
  kind: MemoryKind;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', default: 'global' })
  scope: MemoryScope;

  @Column({ type: 'varchar', nullable: true })
  scopeId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => MemorySource, (source) => source.memory, {
    cascade: ['insert'],
  })
  sources: MemorySource[];
}
