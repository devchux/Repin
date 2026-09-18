import { BadRequestException } from '@nestjs/common';
import type { MemoryService } from './memory.service';
import { MemoryToolsService } from './tools.service';

describe('MemoryToolsService', () => {
  const memories = {
    create: jest.fn(),
    findAll: jest.fn(),
    forget: jest.fn(),
  } as unknown as jest.Mocked<MemoryService>;
  const service = new MemoryToolsService(memories);

  beforeEach(() => jest.clearAllMocks());

  it('rejects a remember call without explicit current user intent', async () => {
    await expect(
      service.execute(
        { name: 'memory_remember', arguments: { content: 'Likes blue' } },
        { userId: 4, runId: 'run-1', userInput: 'What color do I like?' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(memories.create).not.toHaveBeenCalled();
  });

  it('saves explicitly requested webpage memory with untrusted provenance', async () => {
    memories.create.mockResolvedValueOnce({ message: 'created' } as never);
    await service.execute(
      {
        name: 'memory_remember',
        arguments: {
          content: 'The starter plan costs $10',
          scope: 'domain',
          sourceType: 'webpage',
        },
      },
      {
        userId: 4,
        runId: 'run-1',
        userInput: 'Remember this pricing for later',
        currentUrl: 'https://example.com/pricing',
        currentDomain: 'example.com',
      },
    );

    expect(memories.create).toHaveBeenCalledWith(
      4,
      expect.objectContaining({
        scope: 'domain',
        scopeId: 'example.com',
        source: expect.objectContaining({
          type: 'webpage',
          url: 'https://example.com/pricing',
        }),
      }),
    );
  });

  it('rejects forgetting without explicit current user intent', async () => {
    await expect(
      service.execute(
        {
          name: 'memory_forget',
          arguments: { id: '0fd29fab-a044-45b0-a757-e73a8aac5305' },
        },
        { userId: 4, runId: 'run-1', userInput: 'Show my preferences' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(memories.forget).not.toHaveBeenCalled();
  });
});
