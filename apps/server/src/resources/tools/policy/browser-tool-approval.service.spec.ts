import type { Repository } from 'typeorm';
import { BrowserToolApproval } from './browser-tool-approval.entity';
import {
  BrowserToolApprovalRequiredError,
  BrowserToolApprovalService,
} from './browser-tool-approval.service';

describe('BrowserToolApprovalService', () => {
  const repository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(),
    update: jest.fn(),
  } as unknown as Repository<BrowserToolApproval>;
  const approvals = new BrowserToolApprovalService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('allows ordinary tools without creating an approval', async () => {
    await expect(
      approvals.authorize(1, 'run-1', 'browser_get_snapshot', {}),
    ).resolves.toBeUndefined();
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('persists an exact proposed action when approval is required', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(null);
    jest.spyOn(repository, 'save').mockImplementation(async (approval) => ({
      ...approval,
      id: 'approval-1',
    }));

    await expect(
      approvals.authorize(1, 'run-1', 'browser_submit_form', {
        ref: 'form-1',
        documentRevision: 'revision-1',
      }),
    ).rejects.toBeInstanceOf(BrowserToolApprovalRequiredError);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        runId: 'run-1',
        toolName: 'browser_submit_form',
        arguments: {
          ref: 'form-1',
          documentRevision: 'revision-1',
        },
        status: 'pending',
      }),
    );
  });

  it('atomically consumes approval for the matching action', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue({
      id: 'approval-1',
      status: 'approved',
      expiresAt: new Date(Date.now() + 60_000),
    } as BrowserToolApproval);
    jest
      .spyOn(repository, 'update')
      .mockResolvedValue({ affected: 1 } as never);

    await expect(
      approvals.authorize(1, 'run-1', 'browser_submit_form', {
        ref: 'form-1',
        documentRevision: 'revision-1',
      }),
    ).resolves.toBeUndefined();
    expect(repository.update).toHaveBeenCalledWith(
      { id: 'approval-1', status: 'approved' },
      expect.objectContaining({ status: 'consumed' }),
    );
  });
});
