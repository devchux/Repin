import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { Memory } from './entities/memory.entity';
import { MemoryService } from './memory.service';
import { MemorySource } from './entities/memory-source.entity';
import type { LibraryService } from '../library/library.service';

describe('MemoryService', () => {
  const repository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'memory-1', ...value })),
    delete: jest.fn(),
  } as unknown as jest.Mocked<Repository<Memory>>;
  const sourceQuery = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };
  const sourceRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(sourceQuery),
  } as unknown as jest.Mocked<Repository<MemorySource>>;
  const library = {
    findOwned: jest.fn(),
  } as unknown as jest.Mocked<LibraryService>;
  const service = new MemoryService(repository, sourceRepository, library);

  beforeEach(() => {
    jest.clearAllMocks();
    sourceQuery.getOne.mockResolvedValue(null);
  });

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

  it('creates memory only after loading an owned library source', async () => {
    library.findOwned.mockResolvedValueOnce({
      id: '2cc3d0f3-f95a-497d-9d6d-d5943585257d',
      userId: 7,
      type: 'highlight',
      content: 'Quoted page content',
      url: 'https://example.com/article',
    } as never);

    await service.createFromSource(7, {
      sourceId: '2cc3d0f3-f95a-497d-9d6d-d5943585257d',
      content: 'The API will be deprecated in October',
      scope: 'domain',
      scopeId: 'example.com',
    });

    expect(library.findOwned).toHaveBeenCalledWith(
      7,
      '2cc3d0f3-f95a-497d-9d6d-d5943585257d',
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sources: [
          expect.objectContaining({
            type: 'highlight',
            sourceId: '2cc3d0f3-f95a-497d-9d6d-d5943585257d',
            trust: 'untrusted',
          }),
        ],
      }),
    );
  });

  it('rejects an identical memory from the same source', async () => {
    library.findOwned.mockResolvedValueOnce({
      id: '2cc3d0f3-f95a-497d-9d6d-d5943585257d',
      userId: 7,
      type: 'note',
    } as never);
    sourceQuery.getOne.mockResolvedValueOnce({ id: 'source-1' });

    await expect(
      service.createFromSource(7, {
        sourceId: '2cc3d0f3-f95a-497d-9d6d-d5943585257d',
        content: 'Prefer maintainable architecture',
      }),
    ).rejects.toThrow('already created');
    expect(repository.save).not.toHaveBeenCalled();
  });
});
