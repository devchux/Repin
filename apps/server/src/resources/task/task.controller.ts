import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from 'src/shared/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DispatchDto } from './dto/dispatch.dto';
import { SelectionService } from './services/selection.service';

@ApiTags('Tasks')
@Controller('tasks')
export class TaskController {
  constructor(private readonly selection: SelectionService) {}

  @Post()
  dispatch(@CurrentUser() user: AuthUser, @Body() request: DispatchDto) {
    return this.selection.dispatch(user.id, request);
  }
}
