import type { AiService } from '../../ai/ai.service';
import { PlannerService } from './planner.service';

describe('PlannerService', () => {
  const ai = { generate: jest.fn() } as unknown as AiService;
  const service = new PlannerService(ai);

  it('converts a bounded stage plan into a linear workflow definition', async () => {
    jest.spyOn(ai, 'generate').mockResolvedValue({
      provider: 'test',
      model: 'test',
      content: JSON.stringify({
        requiresWorkflow: true,
        reason: 'multi-stage',
        name: 'Product research',
        description: 'Research and compare products',
        successCriteria: ['Products are compared using stated evidence'],
        stages: [
          { instruction: 'Research products' },
          { instruction: 'Compare results' },
        ],
      }),
    });

    const plan = await service.plan({
      capability: 'chat',
      context: {
        url: 'https://example.com',
        title: 'Products',
        pageContent: 'Products',
      },
      input: 'Research and compare products',
    });

    expect(plan?.definition.graph).toMatchObject({
      startNodeId: 'stage-1',
      edges: [
        { from: 'stage-1', to: 'stage-2' },
        { from: 'stage-2', to: 'done' },
      ],
    });
    expect(plan?.definition.goal).toEqual({
      objective: 'Research and compare products',
      successCriteria: ['Products are compared using stated evidence'],
    });
  });

  it('rejects model plans that do not satisfy the shared schema', async () => {
    jest.spyOn(ai, 'generate').mockResolvedValue({
      provider: 'test',
      model: 'test',
      content: JSON.stringify({
        requiresWorkflow: true,
        reason: 'multi-stage',
        name: 'Product research',
        description: 'Research products',
        successCriteria: [],
        stages: [{ instruction: 'Research products' }],
      }),
    });

    await expect(
      service.plan({
        capability: 'chat',
        context: {
          url: 'https://example.com',
          title: 'Products',
          pageContent: 'Products',
        },
        input: 'Research products',
      }),
    ).resolves.toBeUndefined();
  });
});
