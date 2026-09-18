import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { Memory } from './entities/memory.entity';
import { MemoryService } from './memory.service';

describe('MemoryService', () => {
  const repository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'memory-1', ...value })),
    delete: jest.fn(),
  } as unknown as jest.Mocked<Repository<Memory>>;
  const service = new MemoryService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('creates an explicit global user memory by default', async () => {
    const result = await service.create(7, {
      content: '  Prefers dark mode  ',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        kind: 'user',
        content: 'Prefers dark mode',
        scope: 'global',
        sources: [
          expect.objectContaining({ type: 'explicit_user', trust: 'trusted' }),
        ],
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({ id: 'memory-1' }));
  });

  it('marks webpage provenance as untrusted', async () => {
    await service.create(7, {
      content: 'The pricing page says the plan is free',
      scope: 'domain',
      scopeId: 'example.com',
      source: { type: 'webpage', url: 'https://example.com/pricing' },
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sources: [
          expect.objectContaining({ type: 'webpage', trust: 'untrusted' }),
        ],
      }),
    );
  });

  it('requires an identifier for non-global scopes', async () => {
    await expect(
      service.create(7, { content: 'Uses staging', scope: 'project' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forgets only a memory owned by the user', async () => {
    repository.delete.mockResolvedValueOnce({ raw: [], affected: 1 });
    await service.forget(7, '0fd29fab-a044-45b0-a757-e73a8aac5305');
    expect(repository.delete).toHaveBeenCalledWith({
      id: '0fd29fab-a044-45b0-a757-e73a8aac5305',
      userId: 7,
    });

    repository.delete.mockResolvedValueOnce({ raw: [], affected: 0 });
    await expect(
      service.forget(8, '0fd29fab-a044-45b0-a757-e73a8aac5305'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
