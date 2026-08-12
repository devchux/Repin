import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type AssistantMessageRole = 'user' | 'assistant';

@Entity('assistant_conversation_messages')
@Index(['conversationId', 'createdAt'])
@Index(['runId', 'role'], { unique: true })
export class AssistantConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @Column({ type: 'uuid', nullable: true })
  runId?: string;

  @Column()
  role: AssistantMessageRole;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
