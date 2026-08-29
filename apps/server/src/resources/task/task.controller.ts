import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from 'src/shared/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DispatchDto } from './dto/dispatch.dto';
import { DispatchService } from './services/dispatch.service';

@ApiTags('Tasks')
@Controller('tasks')
export class TaskController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post()
  dispatch(@CurrentUser() user: AuthUser, @Body() request: DispatchDto) {
    return this.dispatchService.dispatch(user.id, request);
  }
}
