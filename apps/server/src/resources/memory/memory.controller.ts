import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from 'src/shared/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateMemoryDto } from './dto/create-memory.dto';
import { FindMemoriesDto, FindMemoryContextDto } from './dto/find-memories.dto';
import { MemoryService } from './services/memory.service';
import { CreateMemoryFromSourceDto } from './dto/create-memory-from-source.dto';

@ApiTags('Memories')
@Controller('memories')
export class MemoryController {
  constructor(private readonly memories: MemoryService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() request: CreateMemoryDto) {
    return this.memories.create(user.id, request);
  }

  @Post('from-source')
  createFromSource(
    @CurrentUser() user: AuthUser,
    @Body() request: CreateMemoryFromSourceDto,
  ) {
    return this.memories.createFromSource(user.id, request);
  }

  @Post('from-bookmark')
  createFromBookmark(
    @CurrentUser() user: AuthUser,
    @Body() request: CreateMemoryFromSourceDto,
  ) {
    return this.memories.createFromBookmark(user.id, request);
  }

  @Get('from-bookmark/:bookmarkId')
  findByBookmark(
    @CurrentUser() user: AuthUser,
    @Param('bookmarkId', ParseUUIDPipe) bookmarkId: string,
  ) {
    return this.memories.findByBookmark(user.id, bookmarkId);
  }

  @Post('from-note')
  createFromNote(
    @CurrentUser() user: AuthUser,
    @Body() request: CreateMemoryFromSourceDto,
  ) {
    return this.memories.createFromNote(user.id, request);
  }

  @Get('from-note/:noteId')
  findByNote(
    @CurrentUser() user: AuthUser,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    return this.memories.findByNote(user.id, noteId);
  }

  @Post('from-highlight')
  createFromHighlight(
    @CurrentUser() user: AuthUser,
    @Body() request: CreateMemoryFromSourceDto,
  ) {
    return this.memories.createFromHighlight(user.id, request);
  }

  @Get('from-highlight/:highlightId')
  findByHighlight(
    @CurrentUser() user: AuthUser,
    @Param('highlightId', ParseUUIDPipe) highlightId: string,
  ) {
    return this.memories.findByHighlight(user.id, highlightId);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() request: FindMemoriesDto) {
    return this.memories.findAll(user.id, request);
  }

  @Get('context')
  findContext(
    @CurrentUser() user: AuthUser,
    @Query() request: FindMemoryContextDto,
  ) {
    return this.memories.findContext(user.id, request);
  }

  @Delete(':id')
  forget(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.memories.forget(user.id, id);
  }
}
