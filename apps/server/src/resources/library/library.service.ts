import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';
import { LibraryItem } from './entities/library-item.entity';
import type { FindLibraryItemsDto } from './dto/find-library-items.dto';

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(LibraryItem)
    private readonly items: Repository<LibraryItem>,
  ) {}

  async create(userId: number, request: CreateLibraryItemDto) {
    if (!request.title && !request.content && !request.url) {
      throw new BadRequestException(
        'A library item requires a title, content, or URL',
      );
    }
    const item = await this.items.save(
      this.items.create({
        userId,
        type: request.type,
        title: request.title?.trim(),
        content: request.content?.trim(),
        url: request.url,
      }),
    );
    return { message: 'Library item created successfully', data: item };
  }

  async findAll(userId: number, request: FindLibraryItemsDto) {
    const query = this.items
      .createQueryBuilder('item')
      .where('item.userId = :userId', { userId });
    if (request.type)
      query.andWhere('item.type = :type', { type: request.type });
    if (request.search?.trim()) {
      query.andWhere(
        `(item.title ILIKE :search OR item.content ILIKE :search OR item.url ILIKE :search)`,
        { search: `%${request.search.trim()}%` },
      );
    }
    const [items, total] = await query
      .orderBy('item.updatedAt', 'DESC')
      .skip((request.page - 1) * request.limit)
      .take(request.limit)
      .getManyAndCount();
    return {
      message: 'Library items found successfully',
      data: {
        items,
        page: request.page,
        limit: request.limit,
        total,
        pageCount: Math.ceil(total / request.limit),
      },
    };
  }

  async findOwned(userId: number, id: string): Promise<LibraryItem> {
    const item = await this.items.findOne({ where: { id, userId } });
    if (!item) throw new NotFoundException('Library item not found');
    return item;
  }
}
