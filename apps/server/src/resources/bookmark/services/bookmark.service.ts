import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../../../shared/utils/database';
import {
  normalizeTags,
  normalizeUrl,
} from '../../../shared/utils/normalization';
import { CreateBookmarkDto } from '../dto/create-bookmark.dto';
import { FindBookmarksDto } from '../dto/find-bookmarks.dto';
import { UpdateBookmarkDto } from '../dto/update-bookmark.dto';
import { Bookmark } from '../entities/bookmark.entity';
import { bookmarkSearchVector, toBookmarkSearchHit } from '../utils/search';
import { AiService } from '../../ai/ai.service';
import { BookmarkEnrichmentService } from './enrichment.service';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  BOOKMARK_ENRICHMENT_QUEUE,
  ENRICH_BOOKMARK_JOB,
} from '../utils/constants';

@Injectable()
export class BookmarkService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarks: Repository<Bookmark>,
    @Optional() private readonly ai?: AiService,
    @Optional() private readonly enrichment?: BookmarkEnrichmentService,
    @Optional()
    @InjectQueue(BOOKMARK_ENRICHMENT_QUEUE)
    private readonly enrichmentQueue?: Queue,
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
      try {
        await this.queueEnrichment(data.id);
      } catch (error) {
        data.enrichmentStatus = 'failed';
        data.enrichmentError =
          error instanceof Error
            ? `Queue unavailable: ${error.message}`.slice(0, 2000)
            : 'Enrichment queue unavailable';
        await this.bookmarks.save(data);
      }
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
      if (query.searchMode !== 'lexical' && this.ai) {
        return this.findSemantic(userId, query, search);
      }
      builder.andWhere(
        `${bookmarkSearchVector('bookmark')} @@ websearch_to_tsquery('english', :search)`,
        { search },
      );
    }
    const tags = normalizeTags(query.tags);
    if (tags.length) {
      builder.andWhere('bookmark.tags @> :tags', { tags });
    }
    if (query.collectionId) {
      builder.innerJoin(
        'bookmark_collection_items',
        'collectionItem',
        'collectionItem."bookmarkId" = bookmark.id AND collectionItem."collectionId" = :collectionId',
        { collectionId: query.collectionId },
      );
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
    if (this.ai) {
      const result = await this.findSemantic(
        userId,
        { page: 1, limit: 5, searchMode: 'hybrid' } as FindBookmarksDto,
        search,
      );
      return result.data.items.map((bookmark) =>
        toBookmarkSearchHit(bookmark, search),
      );
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

  async enrich(userId: number, id: string) {
    const bookmark = await this.findUserBookmark(userId, id);
    if (this.enrichmentQueue) {
      await this.queueEnrichment(bookmark.id, true);
      return {
        message: 'Bookmark enrichment queued successfully',
        data: { bookmarkId: bookmark.id, status: 'pending' },
      };
    }
    if (!this.enrichment) {
      throw new BadRequestException('Bookmark enrichment is not configured');
    }
    const data = await this.enrichment.enrich(bookmark);
    return { message: 'Bookmark enriched successfully', data };
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

  private async findSemantic(
    userId: number,
    query: FindBookmarksDto,
    search: string,
  ) {
    if (!this.ai)
      throw new BadRequestException('Semantic search is not configured');
    const [embedding] = await this.ai.embed([search]);
    if (!embedding)
      throw new BadRequestException('Embedding provider returned no result');
    const offset = (query.page - 1) * query.limit;
    const lexical = bookmarkSearchVector('bookmark');
    const semanticOnly = query.searchMode === 'semantic';
    const collectionJoin = query.collectionId
      ? 'INNER JOIN "bookmark_collection_items" item ON item."bookmarkId" = bookmark.id AND item."collectionId" = $6'
      : '';
    const rows = (await this.bookmarks.query(
      `SELECT bookmark.*, COUNT(*) OVER() AS "resultTotal",
        (CASE WHEN ${lexical} @@ websearch_to_tsquery('english', $2)
          THEN ts_rank(${lexical}, websearch_to_tsquery('english', $2)) ELSE 0 END) * $3
        + (CASE WHEN bookmark."embedding" IS NOT NULL
          THEN 1 - (bookmark."embedding" <=> $1::vector) ELSE 0 END) * $4 AS "searchScore"
       FROM "bookmarks" bookmark
       ${collectionJoin}
       WHERE bookmark."userId" = $5 AND bookmark."deletedAt" IS NULL
         AND bookmark."embedding" IS NOT NULL
         AND ($9::text[] IS NULL OR bookmark."tags" @> $9::text[])
         ${semanticOnly ? '' : `AND (${lexical} @@ websearch_to_tsquery('english', $2) OR bookmark."embedding" IS NOT NULL)`}
       ORDER BY "searchScore" DESC, bookmark."createdAt" DESC
       LIMIT $7 OFFSET $8`,
      [
        `[${embedding.join(',')}]`,
        search,
        semanticOnly ? 0 : 0.35,
        semanticOnly ? 1 : 0.65,
        userId,
        query.collectionId ?? null,
        query.limit,
        offset,
        normalizeTags(query.tags).length ? normalizeTags(query.tags) : null,
      ],
    )) as Array<Bookmark & { resultTotal: string; searchScore: string }>;
    const total = Number(rows[0]?.resultTotal ?? 0);
    const items = rows.map((row) => {
      const bookmark = { ...row } as Record<string, unknown>;
      delete bookmark.embedding;
      delete bookmark.resultTotal;
      return bookmark as unknown as Bookmark & { searchScore: string };
    });
    return {
      message: 'Bookmarks found successfully',
      data: {
        items,
        page: query.page,
        limit: query.limit,
        total,
        pageCount: Math.ceil(total / query.limit),
      },
    };
  }

  private async queueEnrichment(bookmarkId: string, replace = false) {
    if (!this.enrichmentQueue) return;
    const jobId = `bookmark:${bookmarkId}`;
    if (replace) {
      const existing = await this.enrichmentQueue.getJob(jobId);
      await existing?.remove();
    }
    await this.enrichmentQueue.add(
      ENRICH_BOOKMARK_JOB,
      { bookmarkId },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
  }
}
