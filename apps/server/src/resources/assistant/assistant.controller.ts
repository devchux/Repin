import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from 'src/shared/types';
import { AssistantService } from './services/assistant.service';
import { ExecuteAssistantDto } from './dto/execute-assistant.dto';

@ApiTags('Assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('runs')
  createRun(
    @CurrentUser() user: AuthUser,
    @Body() request: ExecuteAssistantDto,
  ) {
    return this.assistantService.createRun(user.id, request);
  }

  @Get('runs/:id')
  findRun(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) runId: string,
  ) {
    return this.assistantService.findRun(user.id, runId);
  }

  @Post('runs/:id/cancel')
  cancelRun(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) runId: string,
  ) {
    return this.assistantService.cancelRun(user.id, runId);
  }
}
