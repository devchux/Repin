import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindUserDto } from './dto/find-user.dto';
import { SuperUserGuard } from '../auth/guards/super-user.guard';
import { SelfOrSuperUserGuard } from '../auth/guards/self-or-super-user.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from 'src/shared/types';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @UseGuards(SuperUserGuard)
  findAll(@Query() params: FindUserDto) {
    return this.userService.findAll(params);
  }

  @Get('me')
  findCurrent(@CurrentUser() user: AuthUser) {
    return this.userService.findOne(user.id);
  }

  @Get(':id')
  @UseGuards(SelfOrSuperUserGuard)
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(SelfOrSuperUserGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(SelfOrSuperUserGuard)
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
