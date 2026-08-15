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
import type {
  AssistantOptionsDto,
  AssistantPageContextDto,
} from '../dto/execute-assistant.dto';
import { User } from '../../user/entities/user.entity';
import { AssistantConversationMessage } from './conversation-message.entity';
import { Run } from '../../agent/entities/run.entity';

@Entity('assistant_conversations')
@Index(['userId', 'updatedAt'])
export class AssistantConversation {
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
  context: AssistantPageContextDto;

  @Column({ type: 'jsonb', nullable: true })
  options?: AssistantOptionsDto;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Run, (run) => run.conversation)
  runs: Run[];

  @OneToMany(
    () => AssistantConversationMessage,
    (message) => message.conversation,
  )
  messages: AssistantConversationMessage[];
}
