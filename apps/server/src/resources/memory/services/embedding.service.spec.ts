import type { AiService } from '../../ai/ai.service';
import type { Repository } from 'typeorm';
import { Memory } from '../entities/memory.entity';
import { MemoryEmbeddingService } from '../embedding.service';

describe('MemoryEmbeddingService', () => {
  const memories = {
    findOneByOrFail: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
  } as unknown as jest.Mocked<Repository<Memory>>;
  const ai = { embed: jest.fn() } as unknown as jest.Mocked<AiService>;
  const service = new MemoryEmbeddingService(memories, ai);

  beforeEach(() => jest.clearAllMocks());

  it('stores a generated embedding and completion state', async () => {
    memories.findOneByOrFail.mockResolvedValueOnce({
      id: 'memory-1',
      content: 'Prefers concise answers',
    } as Memory);
    ai.embed.mockResolvedValueOnce([[0.1, 0.2]]);

    await service.embedById('memory-1');

    expect(memories.update).toHaveBeenLastCalledWith(
      'memory-1',
      expect.objectContaining({
        embedding: [0.1, 0.2],
        embeddingStatus: 'complete',
        embeddedAt: expect.any(Date),
      }),
    );
  });

  it('records actionable failure state before allowing a retry', async () => {
    memories.findOneByOrFail.mockResolvedValueOnce({
      id: 'memory-1',
      content: 'Prefers concise answers',
    } as Memory);
    ai.embed.mockRejectedValueOnce(new Error('provider unavailable'));

    await expect(service.embedById('memory-1')).rejects.toThrow(
      'provider unavailable',
    );
    expect(memories.update).toHaveBeenLastCalledWith('memory-1', {
      embeddingStatus: 'failed',
      embeddingError: 'provider unavailable',
    });
  });
});
