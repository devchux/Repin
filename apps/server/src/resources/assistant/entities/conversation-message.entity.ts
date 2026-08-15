import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AssistantConversation } from './conversation.entity';
import { Run } from '../../agent/entities/run.entity';

export type AssistantMessageRole = 'user' | 'assistant';

@Entity('assistant_conversation_messages')
@Index(['conversationId', 'createdAt'])
@Index(['runId', 'role'], { unique: true })
export class AssistantConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @ManyToOne(
    () => AssistantConversation,
    (conversation) => conversation.messages,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'conversationId' })
  conversation: AssistantConversation;

  @Column({ type: 'uuid', nullable: true })
  runId?: string;

  @ManyToOne(() => Run, (run) => run.messages, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'runId' })
  run?: Run;

  @Column()
  role: AssistantMessageRole;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
