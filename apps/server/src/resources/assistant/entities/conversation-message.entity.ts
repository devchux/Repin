import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { Run } from '../../agent/entities/run.entity';

export type ConversationMessageRole = 'user' | 'assistant';

@Entity('assistant_conversation_messages')
@Index(['conversationId', 'createdAt'])
@Index(['runId', 'role'], { unique: true })
export class ConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column({ type: 'uuid', nullable: true })
  runId?: string;

  @ManyToOne(() => Run, (run) => run.messages, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'runId' })
  run?: Run;

  @Column()
  role: ConversationMessageRole;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
