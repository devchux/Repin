import type { AiAssistantCapability } from '@repo/contracts/assistant';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';
import type { OptionsDto, PageContextDto } from '../dto/execute.dto';
import { User } from '../../user/entities/user.entity';
import { ConversationMessage } from './conversation-message.entity';
import { Run } from '../../agent/entities/run.entity';

@Entity('assistant_conversations')
@Index(['userId', 'updatedAt'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.assistantConversations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  initialCapability: AiAssistantCapability;

  @Column({ type: 'jsonb' })
  context: PageContextDto;

  @Column({ type: 'jsonb', nullable: true })
  options?: OptionsDto;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Run, (run) => run.conversation)
  runs: Run[];

  @OneToMany(() => ConversationMessage, (message) => message.conversation)
  messages: ConversationMessage[];
}
