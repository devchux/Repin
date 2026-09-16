import { Base } from 'src/shared/entities/base.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { Conversation } from '../../assistant/entities/conversation.entity';
import { Run } from '../../agent/entities/run.entity';
import { BrowserToolApproval } from '../../tools/policy/browser-tool-approval.entity';
import { Definition } from '../../workflow/entities/definition.entity';
import { Instance } from '../../workflow/entities/instance.entity';
import { Bookmark } from '../../bookmark/entities/bookmark.entity';
import { Note } from '../../note/entities/note.entity';
import { Highlight } from '../../highlight/entities/highlight.entity';

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

  @OneToMany(() => Definition, (definition) => definition.user)
  workflowDefinitions: Definition[];

  @OneToMany(() => Instance, (instance) => instance.user)
  workflowInstances: Instance[];

  @OneToMany(() => Bookmark, (bookmark) => bookmark.user)
  bookmarks: Bookmark[];

  @OneToMany(() => Note, (note) => note.user)
  notes: Note[];

  @OneToMany(() => Highlight, (highlight) => highlight.user)
  highlights: Highlight[];
}
