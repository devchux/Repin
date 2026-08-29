import { Injectable } from '@nestjs/common';
import type { ExecuteDto } from '../dto/execute.dto';
import type { CreateConversationMessageDto } from '../dto/create-conversation-message.dto';
import { ApprovalService } from './approval.service';
import { ConversationService } from './conversation.service';
import { RunService } from './run.service';

/** Compatibility facade for callers that need the complete assistant boundary. */
@Injectable()
export class AssistantService {
  constructor(
    private readonly runs: RunService,
    private readonly conversations: ConversationService,
    private readonly approvals: ApprovalService,
  ) {}

  createRun(userId: number, request: ExecuteDto, idempotencyKey?: string) {
    return this.conversations.createRun(userId, request, idempotencyKey);
  }

  findConversation(userId: number, conversationId: string) {
    return this.conversations.findConversation(userId, conversationId);
  }

  findConversations(userId: number) {
    return this.conversations.findConversations(userId);
  }

  createConversationMessage(
    userId: number,
    conversationId: string,
    request: CreateConversationMessageDto,
  ) {
    return this.conversations.createMessage(userId, conversationId, request);
  }

  findRun(userId: number, runId: string) {
    return this.runs.findRun(userId, runId);
  }

  findRuns(userId: number) {
    return this.runs.findRuns(userId);
  }

  watchRun(userId: number, runId: string) {
    return this.runs.watchRun(userId, runId);
  }

  cancelRun(userId: number, runId: string) {
    return this.runs.cancelRun(userId, runId);
  }

  resumeRun(userId: number, runId: string) {
    return this.runs.resumeRun(userId, runId);
  }

  approveAction(userId: number, runId: string, approvalId: string) {
    return this.approvals.approve(userId, runId, approvalId);
  }

  findPendingApprovals(userId: number, runId: string) {
    return this.approvals.findPending(userId, runId);
  }

  denyAction(userId: number, runId: string, approvalId: string) {
    return this.approvals.deny(userId, runId, approvalId);
  }
}
