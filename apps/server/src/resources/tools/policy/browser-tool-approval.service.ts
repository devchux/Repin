import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { MoreThan, Repository } from 'typeorm';
import { BrowserToolApproval } from './browser-tool-approval.entity';
import { getBrowserToolDescriptor } from './browser-tool-descriptors';
import type { BrowserToolName } from '../types/browser-tool.types';

export const APPROVAL_REQUIRED_BROWSER_TOOLS = [
  'browser_upload_files',
  'browser_submit_form',
  'browser_set_permission',
  'browser_download',
  'browser_paste',
  'browser_execute_script',
  'browser_close_tab',
  'browser_close_window',
] as const satisfies readonly BrowserToolName[];

export class BrowserToolApprovalRequiredError extends Error {
  constructor(readonly approval: BrowserToolApproval) {
    super(`User approval is required for ${approval.toolName}`);
    this.name = 'BrowserToolApprovalRequiredError';
  }
}

@Injectable()
export class BrowserToolApprovalService {
  constructor(
    @InjectRepository(BrowserToolApproval)
    private readonly repository: Repository<BrowserToolApproval>,
  ) {}

  async authorize(
    userId: number,
    runId: string,
    toolName: BrowserToolName,
    argumentsValue: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    if (!getBrowserToolDescriptor(toolName).requiresApproval) return;

    const actionFingerprint = this.fingerprint(toolName, argumentsValue);
    const now = new Date();
    const approved = await this.repository.findOne({
      where: { userId, runId, actionFingerprint, status: 'approved' },
      order: { createdAt: 'DESC' },
    });
    if (approved && approved.expiresAt > now) {
      const consumed = await this.repository.update(
        { id: approved.id, status: 'approved' },
        { status: 'consumed', consumedAt: now },
      );
      if (consumed.affected) return;
    }

    let pending = await this.repository.findOne({
      where: { userId, runId, actionFingerprint, status: 'pending' },
      order: { createdAt: 'DESC' },
    });
    if (pending && pending.expiresAt <= now) {
      await this.repository.update(pending.id, { status: 'expired' });
      pending = null;
    }
    pending ??= await this.repository.save(
      this.repository.create({
        userId,
        runId,
        toolName,
        arguments: argumentsValue,
        actionFingerprint,
        status: 'pending',
        expiresAt: new Date(now.getTime() + 15 * 60_000),
      }),
    );
    throw new BrowserToolApprovalRequiredError(pending);
  }

  async approve(
    userId: number,
    runId: string,
    approvalId: string,
  ): Promise<BrowserToolApproval> {
    const approval = await this.findOwned(userId, runId, approvalId);
    if (approval.status === 'approved') return approval;
    if (approval.status !== 'pending') {
      throw new BadRequestException(`Approval is already ${approval.status}`);
    }
    if (approval.expiresAt <= new Date()) {
      await this.repository.update(approval.id, { status: 'expired' });
      throw new BadRequestException('Approval has expired');
    }
    approval.status = 'approved';
    approval.decidedAt = new Date();
    return this.repository.save(approval);
  }

  async deny(
    userId: number,
    runId: string,
    approvalId: string,
  ): Promise<BrowserToolApproval> {
    const approval = await this.findOwned(userId, runId, approvalId);
    if (approval.status !== 'pending') {
      throw new BadRequestException(`Approval is already ${approval.status}`);
    }
    approval.status = 'denied';
    approval.decidedAt = new Date();
    return this.repository.save(approval);
  }

  findPending(userId: number, runId: string): Promise<BrowserToolApproval[]> {
    return this.repository.find({
      where: {
        userId,
        runId,
        status: 'pending',
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'ASC' },
    });
  }

  private findOwned(userId: number, runId: string, id: string) {
    return this.repository
      .findOne({ where: { id, userId, runId } })
      .then((approval) => {
        if (!approval) throw new NotFoundException('Approval not found');
        return approval;
      });
  }

  private fingerprint(
    toolName: BrowserToolName,
    argumentsValue: Readonly<Record<string, unknown>>,
  ): string {
    return createHash('sha256')
      .update(`${toolName}:${this.stableStringify(argumentsValue)}`)
      .digest('hex');
  }

  private stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      return `{${Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(
          ([key, item]) =>
            `${JSON.stringify(key)}:${this.stableStringify(item)}`,
        )
        .join(',')}}`;
    }
    return JSON.stringify(value);
  }
}
