import { Body, Controller, Post } from '@nestjs/common';
import { IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import type { AuthUser } from 'src/shared/types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { BrowserToolName } from '../types/browser-tool.types';
import {
  APPROVAL_REQUIRED_BROWSER_TOOLS,
  BrowserToolApprovalService,
} from './browser-tool-approval.service';

class ApproveBrowserToolDto {
  @IsUUID()
  runId: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(APPROVAL_REQUIRED_BROWSER_TOOLS)
  toolName: BrowserToolName;
}

@Controller('browser-tool-approvals')
export class BrowserToolApprovalController {
  constructor(private readonly approvals: BrowserToolApprovalService) {}

  @Post()
  approve(
    @CurrentUser() user: AuthUser,
    @Body() request: ApproveBrowserToolDto,
  ) {
    this.approvals.grant(user.id, request.runId, request.toolName);
    return { message: 'Browser tool approved', data: null };
  }
}
