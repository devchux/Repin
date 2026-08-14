import { ForbiddenException } from '@nestjs/common';
import { BrowserToolApprovalService } from './browser-tool-approval.service';

describe('BrowserToolApprovalService', () => {
  it('allows ordinary tools without approval', () => {
    expect(() =>
      new BrowserToolApprovalService().authorize(
        1,
        'run-1',
        'browser_get_snapshot',
      ),
    ).not.toThrow();
  });

  it('requires and consumes approval for consequential tools', () => {
    const approvals = new BrowserToolApprovalService();
    expect(() =>
      approvals.authorize(1, 'run-1', 'browser_submit_form'),
    ).toThrow(ForbiddenException);

    approvals.grant(1, 'run-1', 'browser_submit_form');
    expect(() =>
      approvals.authorize(1, 'run-1', 'browser_submit_form'),
    ).not.toThrow();
    expect(() =>
      approvals.authorize(1, 'run-1', 'browser_submit_form'),
    ).toThrow(ForbiddenException);
  });
});
