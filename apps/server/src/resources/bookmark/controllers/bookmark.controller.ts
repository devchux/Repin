import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from 'src/shared/types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CreateBookmarkDto } from '../dto/create-bookmark.dto';
import { FindBookmarksDto } from '../dto/find-bookmarks.dto';
import { UpdateBookmarkDto } from '../dto/update-bookmark.dto';
import { BookmarkService } from '../services/bookmark.service';

@ApiTags('Bookmarks')
@Controller('bookmarks')
export class BookmarkController {
  constructor(private readonly bookmarks: BookmarkService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() request: CreateBookmarkDto) {
    return this.bookmarks.create(user.id, request);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: FindBookmarksDto) {
    return this.bookmarks.findAll(user.id, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bookmarks.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: UpdateBookmarkDto,
  ) {
    return this.bookmarks.update(user.id, id, request);
  }

  @Post(':id/enrich')
  enrich(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bookmarks.enrich(user.id, id);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bookmarks.remove(user.id, id);
  }
}
