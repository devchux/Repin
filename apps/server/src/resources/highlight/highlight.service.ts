import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { normalizeUrl } from '../../shared/utils/normalization';
import { isUniqueViolation } from '../../shared/utils/database';
import { CreateHighlightDto } from './dto/create-highlight.dto';
import { FindHighlightsDto } from './dto/find-highlights.dto';
import { UpdateHighlightDto } from './dto/update-highlight.dto';
import { Highlight } from './entities/highlight.entity';

const toHighlightResponse = (highlight: Highlight) => ({
  id: highlight.id,
  url: highlight.url,
  pageTitle: highlight.pageTitle,
  quote: highlight.quote,
  prefix: highlight.prefix ?? null,
  suffix: highlight.suffix ?? null,
  note: highlight.note ?? null,
  color: highlight.color,
  capturedAt: highlight.capturedAt,
  createdAt: highlight.createdAt,
  updatedAt: highlight.updatedAt,
});

@Injectable()
export class HighlightService {
  constructor(
    @InjectRepository(Highlight)
    private readonly highlights: Repository<Highlight>,
  ) {}

  async create(userId: number, request: CreateHighlightDto) {
    if (request.clientId) {
      const existing = await this.highlights.findOne({
        where: { userId, clientId: request.clientId },
      });
      if (existing) {
        return {
          message: 'Highlight already saved',
          data: toHighlightResponse(existing),
          created: false,
        };
      }
    }
    const url = request.url.trim();
    const highlight = this.highlights.create({
      userId,
      clientId: request.clientId ?? null,
      url,
      normalizedUrl: normalizeUrl(url),
      pageTitle: request.pageTitle.trim(),
      quote: request.quote,
      prefix: request.prefix ?? null,
      suffix: request.suffix ?? null,
      note: request.note ?? null,
      color: request.color ?? 'yellow',
      capturedAt: request.capturedAt
        ? new Date(request.capturedAt)
        : new Date(),
    });
    try {
      const data = await this.highlights.save(highlight);
      return {
        message: 'Highlight saved successfully',
        data: toHighlightResponse(data),
        created: true,
      };
    } catch (error) {
      if (!request.clientId || !isUniqueViolation(error)) throw error;
      const duplicate = await this.highlights.findOne({
        where: { userId, clientId: request.clientId },
      });
      if (!duplicate) throw error;
      return {
        message: 'Highlight already saved',
        data: toHighlightResponse(duplicate),
        created: false,
      };
    }
  }

  async findAll(userId: number, query: FindHighlightsDto) {
    const builder = this.highlights
      .createQueryBuilder('highlight')
      .where('highlight.userId = :userId', { userId });
    const search = query.search?.trim();
    if (search) {
      builder.andWhere(
        new Brackets((subquery) => {
          subquery
            .where('highlight.quote ILIKE :search', { search: `%${search}%` })
            .orWhere('highlight.note ILIKE :search', { search: `%${search}%` })
            .orWhere('highlight.pageTitle ILIKE :search', {
              search: `%${search}%`,
            });
        }),
      );
    }
    if (query.url) {
      builder.andWhere('highlight.normalizedUrl = :normalizedUrl', {
        normalizedUrl: normalizeUrl(query.url),
      });
    }
    if (query.color) {
      builder.andWhere('highlight.color = :color', { color: query.color });
    }
    const [items, total] = await builder
      .orderBy('highlight.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      message: 'Highlights found successfully',
      data: {
        items: items.map(toHighlightResponse),
        page: query.page,
        limit: query.limit,
        total,
        pageCount: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(userId: number, id: string) {
    return {
      message: 'Highlight found successfully',
      data: toHighlightResponse(await this.findUserHighlight(userId, id)),
    };
  }

  async update(userId: number, id: string, request: UpdateHighlightDto) {
    const highlight = await this.findUserHighlight(userId, id);
    const data = await this.highlights.save(
      this.highlights.merge(highlight, {
        ...(request.note === undefined ? {} : { note: request.note }),
        ...(request.color === undefined
          ? {}
          : { color: request.color ?? 'yellow' }),
      }),
    );
    return {
      message: 'Highlight updated successfully',
      data: toHighlightResponse(data),
    };
  }

  async remove(userId: number, id: string) {
    await this.findUserHighlight(userId, id);
    await this.highlights.softDelete({ id, userId });
    return { message: 'Highlight deleted successfully' };
  }

  private async findUserHighlight(userId: number, id: string) {
    const highlight = await this.highlights.findOne({ where: { id, userId } });
    if (!highlight) throw new NotFoundException('Highlight not found');
    return highlight;
  }
}
