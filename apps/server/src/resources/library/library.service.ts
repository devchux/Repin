import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { LibraryItemType } from '@repo/contracts/library';
import { Repository } from 'typeorm';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';
import { LibraryItem } from './entities/library-item.entity';

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

  async findAll(userId: number, type?: LibraryItemType) {
    const data = await this.items.find({
      where: { userId, ...(type ? { type } : {}) },
      order: { updatedAt: 'DESC' },
      take: 100,
    });
    return { message: 'Library items found successfully', data };
  }

  async findOwned(userId: number, id: string): Promise<LibraryItem> {
    const item = await this.items.findOne({ where: { id, userId } });
    if (!item) throw new NotFoundException('Library item not found');
    return item;
  }
}
