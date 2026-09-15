import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../../shared/utils/database';
import { normalizeTags, normalizeUrl } from '../../shared/utils/normalization';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { FindBookmarksDto } from './dto/find-bookmarks.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';
import { Bookmark } from './entities/bookmark.entity';
import { bookmarkSearchVector, toBookmarkSearchHit } from './bookmark-search';

@Injectable()
export class BookmarkService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarks: Repository<Bookmark>,
  ) {}

  async create(userId: number, request: CreateBookmarkDto) {
    const url = request.url.trim();
    const canonicalUrl = request.canonicalUrl?.trim();
    const normalizedUrl = normalizeUrl(canonicalUrl || url);
    const existing = await this.bookmarks.findOne({
      where: { userId, normalizedUrl },
    });
    if (existing) {
      return {
        message: 'Bookmark already saved',
        data: existing,
        created: false,
      };
    }

    const page = this.bookmarks.create({
      ...request,
      url,
      canonicalUrl: canonicalUrl || null,
      normalizedUrl,
      title: request.title.trim(),
      saveReason: request.saveReason?.trim() || null,
      tags: normalizeTags(request.tags),
      publishedAt: request.publishedAt ? new Date(request.publishedAt) : null,
      capturedAt: request.capturedAt
        ? new Date(request.capturedAt)
        : new Date(),
      userId,
    });

    try {
      const data = await this.bookmarks.save(page);
      return { message: 'Bookmark saved successfully', data, created: true };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const duplicate = await this.bookmarks.findOne({
        where: { userId, normalizedUrl },
      });
      if (!duplicate) throw error;
      return {
        message: 'Bookmark already saved',
        data: duplicate,
        created: false,
      };
    }
  }

  async findAll(userId: number, query: FindBookmarksDto) {
    const builder = this.bookmarks
      .createQueryBuilder('bookmark')
      .where('bookmark.userId = :userId', { userId });
    const search = query.search?.trim();
    if (search) {
      builder.andWhere(
        `${bookmarkSearchVector('bookmark')} @@ websearch_to_tsquery('english', :search)`,
        { search },
      );
    }
    const tags = normalizeTags(query.tags);
    if (tags.length) {
      builder.andWhere('bookmark.tags @> :tags', { tags });
    }
    const [data, total] = await builder
      .orderBy('bookmark.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      message: 'Bookmarks found successfully',
      data: {
        items: data,
        page: query.page,
        limit: query.limit,
        total,
        pageCount: Math.ceil(total / query.limit),
      },
    };
  }

  async search(userId: number, query: string) {
    const search = query.trim();
    if (!search || search.length > 200) {
      throw new BadRequestException('Search query must be 1 to 200 characters');
    }
    const vector = bookmarkSearchVector('bookmark');
    const bookmarks = await this.bookmarks
      .createQueryBuilder('bookmark')
      .where('bookmark.userId = :userId', { userId })
      .andWhere(`${vector} @@ websearch_to_tsquery('english', :search)`, {
        search,
      })
      .orderBy(
        `ts_rank(${vector}, websearch_to_tsquery('english', :search))`,
        'DESC',
      )
      .addOrderBy('bookmark.createdAt', 'DESC')
      .take(5)
      .getMany();

    return bookmarks.map((bookmark) => toBookmarkSearchHit(bookmark, search));
  }

  async findOne(userId: number, id: string) {
    const data = await this.findUserBookmark(userId, id);
    return { message: 'Bookmark found successfully', data };
  }

  async update(userId: number, id: string, request: UpdateBookmarkDto) {
    const page = await this.findUserBookmark(userId, id);
    const data = await this.bookmarks.save(
      this.bookmarks.merge(page, {
        ...request,
        ...(request.title === undefined ? {} : { title: request.title.trim() }),
        ...(request.tags === undefined
          ? {}
          : { tags: normalizeTags(request.tags) }),
        ...(request.saveReason === undefined
          ? {}
          : { saveReason: request.saveReason?.trim() || null }),
        ...(request.publishedAt === undefined
          ? {}
          : { publishedAt: new Date(request.publishedAt) }),
      }),
    );
    return { message: 'Bookmark updated successfully', data };
  }

  async remove(userId: number, id: string) {
    await this.findUserBookmark(userId, id);
    await this.bookmarks.softDelete({ id, userId });
    return { message: 'Bookmark deleted successfully' };
  }

  private async findUserBookmark(userId: number, id: string) {
    const page = await this.bookmarks.findOne({ where: { id, userId } });
    if (!page) throw new NotFoundException('Bookmark not found');
    return page;
  }
}
