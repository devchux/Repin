import type { Repository } from 'typeorm';
import type { AiService } from '../../ai/ai.service';
import type { Definition } from '../../workflow/entities/definition.entity';
import { SelectorService } from './selector.service';

describe('SelectorService', () => {
  const definition = {
    id: 'definition-1',
    key: 'research',
    version: 1,
    name: 'Research',
    activation: { description: 'Research products', examples: [] },
  } as Definition;
  const repository = {
    find: jest.fn().mockResolvedValue([definition]),
  } as unknown as Repository<Definition>;
  const ai = { generate: jest.fn() } as unknown as AiService;
  const service = new SelectorService(repository, ai);

  it('returns only an exact candidate selected by the model', async () => {
    jest.spyOn(ai, 'generate').mockResolvedValue({
      provider: 'test',
      model: 'test',
      content: JSON.stringify({
        workflowDefinitionId: definition.id,
        confidence: 0.9,
        requiresMultipleSteps: true,
        reason: 'matched',
      }),
    });

    await expect(
      service.select(1, {
        capability: 'chat',
        context: {
          url: 'https://example.com',
          title: 'Products',
          pageContent: 'Products',
        },
        input: 'Research products',
      }),
    ).resolves.toMatchObject({ definition: { id: definition.id } });
  });
});
