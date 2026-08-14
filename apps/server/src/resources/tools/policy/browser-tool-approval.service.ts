import { ForbiddenException, Injectable } from '@nestjs/common';
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

interface Approval {
  readonly expiresAt: number;
}

@Injectable()
export class BrowserToolApprovalService {
  private readonly approvals = new Map<string, Approval>();

  grant(userId: number, runId: string, toolName: BrowserToolName): void {
    this.approvals.set(this.key(userId, runId, toolName), {
      expiresAt: Date.now() + 5 * 60_000,
    });
  }

  authorize(userId: number, runId: string, toolName: BrowserToolName): void {
    if (
      !(APPROVAL_REQUIRED_BROWSER_TOOLS as readonly string[]).includes(toolName)
    ) {
      return;
    }
    const key = this.key(userId, runId, toolName);
    const approval = this.approvals.get(key);
    this.approvals.delete(key);
    if (!approval || approval.expiresAt < Date.now()) {
      throw new ForbiddenException(`User approval is required for ${toolName}`);
    }
  }

  private key(
    userId: number,
    runId: string,
    toolName: BrowserToolName,
  ): string {
    return `${userId}:${runId}:${toolName}`;
  }
}
