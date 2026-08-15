import { Base } from 'src/shared/entities/base.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { AssistantConversation } from '../../assistant/entities/conversation.entity';
import { AssistantRun } from '../../assistant/entities/run.entity';
import { BrowserToolApproval } from '../../tools/policy/browser-tool-approval.entity';

@Entity()
export class User extends Base {
  @Column({ nullable: false })
  firstName: string;

  @Column({ nullable: false })
  lastName: string;

  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ default: false })
  isSuper?: boolean;

  @OneToMany(() => AssistantConversation, (conversation) => conversation.user)
  assistantConversations: AssistantConversation[];

  @OneToMany(() => AssistantRun, (run) => run.user)
  assistantRuns: AssistantRun[];

  @OneToMany(() => BrowserToolApproval, (approval) => approval.user)
  browserToolApprovals: BrowserToolApproval[];
}
