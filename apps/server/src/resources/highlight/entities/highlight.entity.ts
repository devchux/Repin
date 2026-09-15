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

export const HIGHLIGHT_COLORS = [
  'yellow',
  'orange',
  'blue',
  'green',
  'pink',
] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

@Entity('highlights')
@Index('IDX_highlights_user_created', ['userId', 'createdAt'])
@Index('IDX_highlights_user_normalized_url', ['userId', 'normalizedUrl'])
@Index('IDX_highlights_user_client_id', ['userId', 'clientId'], {
  unique: true,
  where: '"clientId" IS NOT NULL AND "deletedAt" IS NULL',
})
export class Highlight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.highlights, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  clientId?: string | null;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'text' })
  normalizedUrl: string;

  @Column({ type: 'varchar', length: 500 })
  pageTitle: string;

  @Column({ type: 'text' })
  quote: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  prefix?: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  suffix?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'yellow' })
  color: HighlightColor;

  @Column({ type: 'timestamptz' })
  capturedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date | null;
}
