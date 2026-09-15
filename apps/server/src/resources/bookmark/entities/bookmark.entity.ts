import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('bookmarks')
@Index('IDX_bookmarks_user_normalized_url', ['userId', 'normalizedUrl'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
@Index('IDX_bookmarks_user_created', ['userId', 'createdAt'])
export class Bookmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.bookmarks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'text' })
  normalizedUrl: string;

  @Column({ type: 'text', nullable: true })
  canonicalUrl?: string | null;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  siteName?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  author?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  faviconUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  excerpt?: string | null;

  @Column({ type: 'text', nullable: true })
  content?: string | null;

  @Column({ type: 'text', nullable: true })
  selectedText?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[];

  @Column({ type: 'timestamptz' })
  capturedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date | null;
}
