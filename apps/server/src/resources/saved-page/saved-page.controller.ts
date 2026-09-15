import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from 'src/shared/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FindSavedPagesDto } from './dto/find-saved-pages.dto';
import { UpdateSavedPageDto } from './dto/update-saved-page.dto';
import { SavedPageService } from './saved-page.service';

@ApiTags('Saved pages')
@Controller('saved-pages')
export class SavedPageController {
  constructor(private readonly savedPages: SavedPageService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: FindSavedPagesDto) {
    return this.savedPages.findAll(user.id, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.savedPages.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: UpdateSavedPageDto,
  ) {
    return this.savedPages.update(user.id, id, request);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.savedPages.remove(user.id, id);
  }
}
