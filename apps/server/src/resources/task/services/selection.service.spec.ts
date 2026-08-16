import type { Repository } from 'typeorm';
import type { AiService } from '../../ai/ai.service';
import type { AssistantService } from '../../assistant/services/assistant.service';
import { Definition } from '../../workflow/entities/definition.entity';
import type { WorkflowService } from '../../workflow/services/workflow.service';
import { SelectionService } from './selection.service';

describe('SelectionService', () => {
  const definition = {
    id: '5f2a48de-e9dd-4b85-bbfa-ee901a6942cd',
    userId: 1,
    key: 'product-research',
    version: 2,
    name: 'Product research',
    activation: {
      description: 'Research and compare products before recommending one',
      examples: ['Research three laptops and recommend the best one'],
    },
  } as Definition;
  const definitions = {
    find: jest.fn().mockResolvedValue([definition]),
  } as unknown as Repository<Definition>;
  const ai = { generate: jest.fn() } as unknown as AiService;
  const assistant = {
    createRun: jest.fn().mockResolvedValue({
      message: 'Assistant run queued successfully',
      data: { id: 'run-1', status: 'queued' },
    }),
  } as unknown as AssistantService;
  const workflows = {
    createGeneratedDefinition: jest.fn().mockResolvedValue({
      data: { id: 'generated-definition-1' },
    }),
    start: jest.fn().mockResolvedValue({
      message: 'Workflow started successfully',
      data: { id: 'workflow-1', status: 'queued' },
    }),
  } as unknown as WorkflowService;
  const selection = new SelectionService(definitions, ai, assistant, workflows);
  const request = {
    capability: 'chat' as const,
    context: {
      url: 'https://example.com',
      title: 'Products',
      pageContent: 'Product listings',
    },
    input: 'Research three laptops and recommend the best one',
  };

  beforeEach(() => jest.clearAllMocks());

  it('starts a selected workflow for a confident multi-stage task', async () => {
    jest.spyOn(definitions, 'find').mockResolvedValue([definition]);
    jest.spyOn(ai, 'generate').mockResolvedValue({
      provider: 'test',
      model: 'test',
      content: JSON.stringify({
        workflowDefinitionId: definition.id,
        confidence: 0.94,
        requiresMultipleSteps: true,
        reason: 'The task requires research, comparison, and recommendation',
      }),
    });

    await expect(selection.dispatch(1, request)).resolves.toMatchObject({
      data: { kind: 'workflow', id: 'workflow-1' },
    });
    expect(workflows.start).toHaveBeenCalledWith(1, definition.id, {
      input: { task: request },
    });
    expect(assistant.createRun).not.toHaveBeenCalled();
  });

  it('keeps a simple task on the direct assistant path', async () => {
    jest.spyOn(definitions, 'find').mockResolvedValue([definition]);
    jest.spyOn(ai, 'generate').mockResolvedValue({
      provider: 'test',
      model: 'test',
      content: JSON.stringify({
        workflowDefinitionId: null,
        confidence: 0.99,
        requiresMultipleSteps: false,
        reason: 'This is one operation',
      }),
    });

    await expect(
      selection.dispatch(1, { ...request, input: 'Summarize this page' }),
    ).resolves.toMatchObject({ data: { kind: 'run', id: 'run-1' } });
    expect(assistant.createRun).toHaveBeenCalled();
    expect(workflows.start).not.toHaveBeenCalled();
  });

  it('generates and starts a workflow when no definition exists', async () => {
    jest.spyOn(definitions, 'find').mockResolvedValue([]);
    jest.spyOn(ai, 'generate').mockResolvedValue({
      provider: 'test',
      model: 'test',
      content: JSON.stringify({
        requiresWorkflow: true,
        reason: 'The task requires research and comparison',
        name: 'Laptop research',
        description: 'Research laptops and compare the results',
        stages: [
          { instruction: 'Research suitable laptops' },
          { instruction: 'Compare the researched laptops' },
        ],
      }),
    });

    await expect(selection.dispatch(1, request)).resolves.toMatchObject({
      data: { kind: 'workflow', id: 'workflow-1' },
    });
    expect(workflows.createGeneratedDefinition).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        name: 'Laptop research',
        graph: expect.objectContaining({ startNodeId: 'stage-1' }),
      }),
    );
    expect(workflows.start).toHaveBeenCalledWith(
      1,
      'generated-definition-1',
      expect.anything(),
    );
  });
});
