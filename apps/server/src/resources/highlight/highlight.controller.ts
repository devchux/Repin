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
import { CreateHighlightDto } from './dto/create-highlight.dto';
import { FindHighlightsDto } from './dto/find-highlights.dto';
import { UpdateHighlightDto } from './dto/update-highlight.dto';
import { HighlightService } from './highlight.service';

@ApiTags('Highlights')
@Controller('highlights')
export class HighlightController {
  constructor(private readonly highlights: HighlightService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() request: CreateHighlightDto) {
    return this.highlights.create(user.id, request);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: FindHighlightsDto) {
    return this.highlights.findAll(user.id, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.highlights.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: UpdateHighlightDto,
  ) {
    return this.highlights.update(user.id, id, request);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.highlights.remove(user.id, id);
  }
}
