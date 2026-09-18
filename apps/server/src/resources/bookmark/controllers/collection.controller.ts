import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from 'src/shared/types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { BookmarkCollectionService } from './collection.service';
import { CreateBookmarkCollectionDto } from '../dto/create-bookmark-collection.dto';
import { UpdateBookmarkCollectionDto } from '../dto/update-bookmark-collection.dto';

@ApiTags('Bookmark collections')
@Controller('bookmark-collections')
export class BookmarkCollectionController {
  constructor(private readonly collections: BookmarkCollectionService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateBookmarkCollectionDto,
  ) {
    return this.collections.create(user.id, body);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.collections.findAll(user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateBookmarkCollectionDto,
  ) {
    return this.collections.update(user.id, id, body);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.collections.remove(user.id, id);
  }

  @Post(':id/bookmarks/:bookmarkId')
  addBookmark(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('bookmarkId', ParseUUIDPipe) bookmarkId: string,
  ) {
    return this.collections.addBookmark(user.id, id, bookmarkId);
  }

  @Delete(':id/bookmarks/:bookmarkId')
  removeBookmark(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('bookmarkId', ParseUUIDPipe) bookmarkId: string,
  ) {
    return this.collections.removeBookmark(user.id, id, bookmarkId);
  }
}
