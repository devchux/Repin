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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateNoteDto } from './dto/create-note.dto';
import { FindNotesDto } from './dto/find-notes.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NoteService } from './note.service';

@ApiTags('Notes')
@Controller('notes')
export class NoteController {
  constructor(private readonly notes: NoteService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() request: CreateNoteDto) {
    return this.notes.create(user.id, request);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: FindNotesDto) {
    return this.notes.findAll(user.id, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notes.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: UpdateNoteDto,
  ) {
    return this.notes.update(user.id, id, request);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notes.remove(user.id, id);
  }
}
