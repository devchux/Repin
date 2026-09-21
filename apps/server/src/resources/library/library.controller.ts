import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from 'src/shared/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';
import { LibraryService } from './library.service';
import { FindLibraryItemsDto } from './dto/find-library-items.dto';

@ApiTags('Library')
@Controller('library-items')
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() request: CreateLibraryItemDto) {
    return this.library.create(user.id, request);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() request: FindLibraryItemsDto,
  ) {
    return this.library.findAll(user.id, request);
  }
}
