import { AiService } from './ai.service';
import type { AiGenerateResult, AiProvider } from './types/provider';

const result: AiGenerateResult = {
  provider: 'test',
  model: 'test-model',
  content: 'done',
  toolCalls: [],
};

describe('AiService', () => {
  it('delegates generation to the configured provider', async () => {
    const provider: AiProvider = {
      generate: jest.fn().mockResolvedValue(result),
    };
    const service = new AiService(provider);
    const options = {
      messages: [{ role: 'user', content: 'Save this page' }],
      tools: [
        {
          name: 'bookmark_page',
          description: 'Save the current page',
          inputSchema: { type: 'object' },
        },
      ],
    };

    await expect(service.generate(options)).resolves.toBe(result);
    expect(provider.generate).toHaveBeenCalledWith(options);
  });

  it('fails clearly when no provider is configured', () => {
    const service = new AiService();

    expect(() => service.generate({ messages: [] })).toThrow(
      'AI provider is not configured',
    );
  });
});
