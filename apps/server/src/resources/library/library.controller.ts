import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  LIBRARY_ITEM_TYPES,
  type LibraryItemType,
} from '@repo/contracts/library';
import { IsIn, IsOptional } from 'class-validator';
import type { AuthUser } from 'src/shared/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';
import { LibraryService } from './library.service';

class FindLibraryItemsDto {
  @IsOptional()
  @IsIn(LIBRARY_ITEM_TYPES)
  type?: LibraryItemType;
}

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
    return this.library.findAll(user.id, request.type);
  }
}
