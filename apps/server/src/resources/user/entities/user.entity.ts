import { Base } from 'src/shared/entities/base.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { Conversation } from '../../assistant/entities/conversation.entity';
import { Run } from '../../agent/entities/run.entity';
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

  @OneToMany(() => Conversation, (conversation) => conversation.user)
  assistantConversations: Conversation[];

  @OneToMany(() => Run, (run) => run.user)
  assistantRuns: Run[];

  @OneToMany(() => BrowserToolApproval, (approval) => approval.user)
  browserToolApprovals: BrowserToolApproval[];
}
