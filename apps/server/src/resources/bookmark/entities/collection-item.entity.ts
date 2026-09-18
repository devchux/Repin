import { CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('bookmark_collection_items')
@Index('IDX_bookmark_collection_items_bookmark', ['bookmarkId'])
export class BookmarkCollectionItem {
  @PrimaryColumn('uuid')
  collectionId: string;

  @PrimaryColumn('uuid')
  bookmarkId: string;

  @CreateDateColumn()
  createdAt: Date;
}
