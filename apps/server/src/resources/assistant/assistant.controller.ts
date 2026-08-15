import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Sse,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from 'src/shared/types';
import { AssistantService } from './services/assistant.service';
import { ExecuteDto } from './dto/execute.dto';
import { SkipTimeout } from 'src/shared/decorators/skip-timeout.decorator';
import { SkipResponseTransform } from 'src/shared/decorators/skip-response-transform.decorator';
import { CreateConversationMessageDto } from './dto/create-conversation-message.dto';

@ApiTags('Assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('runs')
  createRun(@CurrentUser() user: AuthUser, @Body() request: ExecuteDto) {
    return this.assistantService.createRun(user.id, request);
  }

  @Get('runs/:id')
  findRun(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) runId: string,
  ) {
    return this.assistantService.findRun(user.id, runId);
  }

  @Sse('runs/:id/events')
  @SkipTimeout()
  @SkipResponseTransform()
  async watchRun(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) runId: string,
  ) {
    return this.assistantService.watchRun(user.id, runId);
  }

  @Post('runs/:id/cancel')
  cancelRun(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) runId: string,
  ) {
    return this.assistantService.cancelRun(user.id, runId);
  }

  @Post('runs/:id/resume')
  resumeRun(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) runId: string,
  ) {
    return this.assistantService.resumeRun(user.id, runId);
  }

  @Post('runs/:id/approvals/:approvalId/approve')
  approveAction(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) runId: string,
    @Param('approvalId', ParseUUIDPipe) approvalId: string,
  ) {
    return this.assistantService.approveAction(user.id, runId, approvalId);
  }

  @Get('runs/:id/approvals')
  findPendingApprovals(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) runId: string,
  ) {
    return this.assistantService.findPendingApprovals(user.id, runId);
  }

  @Post('runs/:id/approvals/:approvalId/deny')
  denyAction(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) runId: string,
    @Param('approvalId', ParseUUIDPipe) approvalId: string,
  ) {
    return this.assistantService.denyAction(user.id, runId, approvalId);
  }

  @Get('conversations/:id')
  findConversation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) conversationId: string,
  ) {
    return this.assistantService.findConversation(user.id, conversationId);
  }

  @Post('conversations/:id/messages')
  createConversationMessage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body() request: CreateConversationMessageDto,
  ) {
    return this.assistantService.createConversationMessage(
      user.id,
      conversationId,
      request,
    );
  }
}
