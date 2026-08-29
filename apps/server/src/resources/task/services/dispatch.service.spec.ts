import type { AssistantService } from '../../assistant/services/assistant.service';
import type { WorkflowService } from '../../workflow/services/workflow.service';
import type { PlannerService } from './planner.service';
import type { SelectorService } from './selector.service';
import { DispatchService } from './dispatch.service';

describe('DispatchService', () => {
  const selector = { select: jest.fn() } as unknown as SelectorService;
  const planner = { plan: jest.fn() } as unknown as PlannerService;
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
  const service = new DispatchService(selector, planner, assistant, workflows);
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

  it('starts a confidently selected workflow', async () => {
    jest.spyOn(selector, 'select').mockResolvedValue({
      definition: { id: 'definition-1' } as never,
      decision: {
        workflowDefinitionId: 'definition-1',
        confidence: 0.94,
        requiresMultipleSteps: true,
        reason: 'matched',
      },
    });

    await expect(service.dispatch(1, request)).resolves.toMatchObject({
      data: { kind: 'workflow', id: 'workflow-1' },
    });
    expect(workflows.start).toHaveBeenCalledWith(
      1,
      'definition-1',
      expect.anything(),
    );
  });

  it('generates a definition when no workflow matches', async () => {
    jest.spyOn(selector, 'select').mockResolvedValue({
      decision: {
        confidence: 1,
        requiresMultipleSteps: true,
        reason: 'no_workflow_candidate',
      },
    });
    jest.spyOn(planner, 'plan').mockResolvedValue({
      reason: 'multi-stage',
      definition: { key: 'generated', name: 'Generated' } as never,
    });

    await expect(service.dispatch(1, request)).resolves.toMatchObject({
      data: { kind: 'workflow', id: 'workflow-1' },
    });
    expect(workflows.createGeneratedDefinition).toHaveBeenCalled();
  });

  it('keeps a simple task on the assistant path', async () => {
    jest.spyOn(selector, 'select').mockResolvedValue({
      decision: {
        confidence: 0.99,
        requiresMultipleSteps: false,
        reason: 'simple',
      },
    });

    await expect(service.dispatch(1, request)).resolves.toMatchObject({
      data: { kind: 'run', id: 'run-1' },
    });
  });
});
