import { BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { AssistantService } from './assistant.service';

describe('AssistantService', () => {
  const aiService = {
    generate: jest.fn(),
  } as unknown as AiService;
  const service = new AssistantService(aiService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes a supported assistant capability', async () => {
    jest.spyOn(aiService, 'generate').mockResolvedValue({
      content: 'A short summary',
      usage: { inputTokens: 20, outputTokens: 4 },
    });

    await expect(
      service.execute({
        capability: 'summarize',
        context: {
          url: 'https://example.com/article',
          title: 'Example article',
          selectedText: 'Article content',
        },
      }),
    ).resolves.toEqual({
      message: 'Assistant request completed successfully',
      data: {
        capability: 'summarize',
        content: 'A short summary',
        usage: { inputTokens: 20, outputTokens: 4 },
      },
    });
  });

  it('requires a target language for translation', async () => {
    await expect(
      service.execute({
        capability: 'translate',
        context: {
          url: 'https://example.com',
          title: 'Example',
          selectedText: 'Hello',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
