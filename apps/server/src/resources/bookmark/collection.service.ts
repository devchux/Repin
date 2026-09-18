import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBookmarkCollectionDto } from './dto/create-bookmark-collection.dto';
import { UpdateBookmarkCollectionDto } from './dto/update-bookmark-collection.dto';
import { Bookmark } from './entities/bookmark.entity';
import { BookmarkCollection } from './entities/collection.entity';
import { BookmarkCollectionItem } from './entities/collection-item.entity';

@Injectable()
export class BookmarkCollectionService {
  constructor(
    @InjectRepository(BookmarkCollection)
    private readonly collections: Repository<BookmarkCollection>,
    @InjectRepository(BookmarkCollectionItem)
    private readonly items: Repository<BookmarkCollectionItem>,
    @InjectRepository(Bookmark)
    private readonly bookmarks: Repository<Bookmark>,
  ) {}

  async create(userId: number, request: CreateBookmarkCollectionDto) {
    const data = await this.collections.save(
      this.collections.create({
        userId,
        name: request.name.trim(),
        description: request.description?.trim() || null,
        color: request.color || null,
      }),
    );
    return { message: 'Bookmark collection created successfully', data };
  }

  async findAll(userId: number) {
    const data = await this.collections
      .createQueryBuilder('collection')
      .leftJoin(
        BookmarkCollectionItem,
        'item',
        'item."collectionId" = collection.id',
      )
      .where('collection."userId" = :userId', { userId })
      .select('collection')
      .addSelect('COUNT(item."bookmarkId")', 'bookmarkCount')
      .groupBy('collection.id')
      .orderBy('collection."updatedAt"', 'DESC')
      .getRawAndEntities();
    return {
      message: 'Bookmark collections found successfully',
      data: data.entities.map((collection, index) => ({
        ...collection,
        bookmarkCount: Number(data.raw[index]?.bookmarkCount ?? 0),
      })),
    };
  }

  async update(
    userId: number,
    id: string,
    request: UpdateBookmarkCollectionDto,
  ) {
    const collection = await this.findUserCollection(userId, id);
    const data = await this.collections.save(
      this.collections.merge(collection, {
        ...request,
        ...(request.name === undefined ? {} : { name: request.name.trim() }),
        ...(request.description === undefined
          ? {}
          : { description: request.description?.trim() || null }),
      }),
    );
    return { message: 'Bookmark collection updated successfully', data };
  }

  async remove(userId: number, id: string) {
    await this.findUserCollection(userId, id);
    await this.collections.delete({ id, userId });
    return { message: 'Bookmark collection deleted successfully' };
  }

  async addBookmark(userId: number, collectionId: string, bookmarkId: string) {
    await Promise.all([
      this.findUserCollection(userId, collectionId),
      this.findUserBookmark(userId, bookmarkId),
    ]);
    await this.items.upsert({ collectionId, bookmarkId }, [
      'collectionId',
      'bookmarkId',
    ]);
    return { message: 'Bookmark added to collection successfully' };
  }

  async removeBookmark(
    userId: number,
    collectionId: string,
    bookmarkId: string,
  ) {
    await this.findUserCollection(userId, collectionId);
    await this.items.delete({ collectionId, bookmarkId });
    return { message: 'Bookmark removed from collection successfully' };
  }

  private async findUserCollection(userId: number, id: string) {
    const collection = await this.collections.findOne({
      where: { id, userId },
    });
    if (!collection)
      throw new NotFoundException('Bookmark collection not found');
    return collection;
  }

  private async findUserBookmark(userId: number, id: string) {
    const bookmark = await this.bookmarks.findOne({ where: { id, userId } });
    if (!bookmark) throw new NotFoundException('Bookmark not found');
    return bookmark;
  }
}
