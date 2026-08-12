import type { AiAssistantCapability } from '@repo/contracts/assistant';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  AssistantOptionsDto,
  AssistantPageContextDto,
} from '../dto/execute-assistant.dto';

@Entity('assistant_conversations')
@Index(['userId', 'updatedAt'])
export class AssistantConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

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
}
