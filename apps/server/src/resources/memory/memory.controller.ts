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
import { MemoryService } from './memory.service';

@ApiTags('Memories')
@Controller('memories')
export class MemoryController {
  constructor(private readonly memories: MemoryService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() request: CreateMemoryDto) {
    return this.memories.create(user.id, request);
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
