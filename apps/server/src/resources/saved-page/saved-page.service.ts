import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { isUniqueViolation } from '../../shared/utils/database';
import { normalizeTags, normalizeUrl } from '../../shared/utils/normalization';
import { CreateSavedPageDto } from './dto/create-saved-page.dto';
import { FindSavedPagesDto } from './dto/find-saved-pages.dto';
import { UpdateSavedPageDto } from './dto/update-saved-page.dto';
import { SavedPage } from './entities/saved-page.entity';

@Injectable()
export class SavedPageService {
  constructor(
    @InjectRepository(SavedPage)
    private readonly savedPages: Repository<SavedPage>,
  ) {}

  async create(userId: number, request: CreateSavedPageDto) {
    const url = request.url.trim();
    const canonicalUrl = request.canonicalUrl?.trim();
    const normalizedUrl = normalizeUrl(canonicalUrl || url);
    const existing = await this.savedPages.findOne({
      where: { userId, normalizedUrl },
    });
    if (existing) {
      return { message: 'Page already saved', data: existing, created: false };
    }

    const page = this.savedPages.create({
      ...request,
      url,
      canonicalUrl: canonicalUrl || null,
      normalizedUrl,
      title: request.title.trim(),
      tags: normalizeTags(request.tags),
      publishedAt: request.publishedAt ? new Date(request.publishedAt) : null,
      capturedAt: request.capturedAt
        ? new Date(request.capturedAt)
        : new Date(),
      userId,
    });

    try {
      const data = await this.savedPages.save(page);
      return { message: 'Page saved successfully', data, created: true };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const duplicate = await this.savedPages.findOne({
        where: { userId, normalizedUrl },
      });
      if (!duplicate) throw error;
      return { message: 'Page already saved', data: duplicate, created: false };
    }
  }

  async findAll(userId: number, query: FindSavedPagesDto) {
    const builder = this.savedPages
      .createQueryBuilder('page')
      .where('page.userId = :userId', { userId });
    const search = query.search?.trim();
    if (search) {
      builder.andWhere(
        new Brackets((subquery) => {
          subquery
            .where('page.title ILIKE :search', { search: `%${search}%` })
            .orWhere('page.description ILIKE :search', {
              search: `%${search}%`,
            })
            .orWhere('page.note ILIKE :search', { search: `%${search}%` })
            .orWhere('page.url ILIKE :search', { search: `%${search}%` });
        }),
      );
    }
    const tags = normalizeTags(query.tags);
    if (tags.length) {
      builder.andWhere('page.tags @> :tags', { tags });
    }
    const [data, total] = await builder
      .orderBy('page.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      message: 'Saved pages found successfully',
      data: {
        items: data,
        page: query.page,
        limit: query.limit,
        total,
        pageCount: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(userId: number, id: string) {
    const data = await this.findUserPage(userId, id);
    return { message: 'Saved page found successfully', data };
  }

  async update(userId: number, id: string, request: UpdateSavedPageDto) {
    const page = await this.findUserPage(userId, id);
    const data = await this.savedPages.save(
      this.savedPages.merge(page, {
        ...request,
        ...(request.title === undefined ? {} : { title: request.title.trim() }),
        ...(request.tags === undefined
          ? {}
          : { tags: normalizeTags(request.tags) }),
        ...(request.publishedAt === undefined
          ? {}
          : { publishedAt: new Date(request.publishedAt) }),
      }),
    );
    return { message: 'Saved page updated successfully', data };
  }

  async remove(userId: number, id: string) {
    await this.findUserPage(userId, id);
    await this.savedPages.softDelete({ id, userId });
    return { message: 'Saved page deleted successfully' };
  }

  private async findUserPage(userId: number, id: string) {
    const page = await this.savedPages.findOne({ where: { id, userId } });
    if (!page) throw new NotFoundException('Saved page not found');
    return page;
  }
}
