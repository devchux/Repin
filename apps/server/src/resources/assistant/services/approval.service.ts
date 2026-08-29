import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ExecutionService } from '../../agent/services/execution.service';
import { BrowserToolApprovalService } from '../../tools/policy/browser-tool-approval.service';
import { RunService } from './run.service';

@Injectable()
export class ApprovalService {
  constructor(
    private readonly runs: RunService,
    private readonly execution: ExecutionService,
    private readonly approvals: BrowserToolApprovalService,
  ) {}

  async approve(userId: number, runId: string, approvalId: string) {
    const run = await this.runs.findUserRun(userId, runId);
    if (run.status !== 'awaiting_approval') {
      throw new BadRequestException('Assistant run is not awaiting approval');
    }
    const approval = await this.approvals.approve(userId, runId, approvalId);
    const resumed = await this.execution.transition(runId, {
      expectedStatuses: ['awaiting_approval'],
      status: 'queued',
      phase: 'queued',
      eventType: 'approval.approved',
      eventData: { approvalId },
      checkpointState: {
        approvedActionFingerprint: approval.actionFingerprint,
      },
      patch: { error: null },
    });
    try {
      await this.runs.enqueue(
        runId,
        resumed.executionLane,
        `approval:${approvalId}`,
      );
    } catch {
      await this.execution.transition(runId, {
        expectedStatuses: ['queued'],
        status: 'failed',
        phase: 'terminal',
        eventType: 'run.resume_failed',
        patch: {
          error: 'Unable to resume approved assistant run',
          completedAt: new Date(),
        },
      });
      throw new ServiceUnavailableException(
        'Unable to resume approved assistant run',
      );
    }
    return {
      message: 'Browser action approved and run resumed',
      data: this.runs.toResponse(resumed),
    };
  }

  async findPending(userId: number, runId: string) {
    await this.runs.findUserRun(userId, runId);
    const approvals = await this.approvals.findPending(userId, runId);
    return {
      message: 'Pending browser action approvals found',
      data: approvals.map((approval) => ({
        id: approval.id,
        toolName: approval.toolName,
        arguments: approval.arguments,
        effect: approval.effect,
        reason: approval.reason,
        expiresAt: approval.expiresAt,
        createdAt: approval.createdAt,
      })),
    };
  }

  async deny(userId: number, runId: string, approvalId: string) {
    const run = await this.runs.findUserRun(userId, runId);
    if (run.status !== 'awaiting_approval') {
      throw new BadRequestException('Assistant run is not awaiting approval');
    }
    await this.approvals.deny(userId, runId, approvalId);
    const failed = await this.execution.transition(runId, {
      expectedStatuses: ['awaiting_approval'],
      status: 'failed',
      phase: 'terminal',
      eventType: 'approval.denied',
      eventData: { approvalId },
      patch: {
        error: 'User denied the proposed browser action',
        completedAt: new Date(),
      },
    });
    return {
      message: 'Browser action denied',
      data: this.runs.toResponse(failed),
    };
  }
}
