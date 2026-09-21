import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Bookmark } from './bookmark.entity';

@Entity('bookmark_collections')
@Index('IDX_bookmark_collections_user_name', ['userId', 'name'], {
  unique: true,
})
export class BookmarkCollection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => Bookmark, (bookmark) => bookmark.collections)
  @JoinTable({
    name: 'bookmark_collection_items',
    joinColumn: {
      name: 'collectionId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'bookmarkId',
      referencedColumnName: 'id',
    },
  })
  bookmarks: Bookmark[];
}
