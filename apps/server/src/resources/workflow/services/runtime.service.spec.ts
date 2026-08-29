import type { Job } from 'bullmq';
import type { Repository } from 'typeorm';
import type { AssistantService } from '../../assistant/services/assistant.service';
import { Instance } from '../entities/instance.entity';
import { RuntimeService } from './runtime.service';
import type { GoalValidatorService } from './goal-validator.service';

describe('RuntimeService', () => {
  const instance = {
    id: '8dad4b93-1ac4-4ed3-b1ec-d22c4bc33d70',
    userId: 1,
    definitionId: 'b4103b06-8b6d-46e7-adf8-a03c4dd15a67',
    status: 'queued',
    currentNodeId: 'check',
    input: { ready: true },
    output: {},
    eventSequence: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    definition: {
      graph: {
        startNodeId: 'check',
        nodes: [
          {
            id: 'check',
            type: 'condition',
            inputKey: 'input.ready',
            operator: 'equals',
            value: true,
          },
          { id: 'done', type: 'end' },
          { id: 'not-ready', type: 'end' },
        ],
        edges: [
          { from: 'check', to: 'done', outcome: 'true' },
          { from: 'check', to: 'not-ready', outcome: 'false' },
        ],
      },
    },
  } as unknown as Instance;
  const executions: Array<Record<string, unknown>> = [];
  const nodeRepository = {
    findOne: jest.fn(({ where }) =>
      Promise.resolve(
        executions.find(
          (execution) =>
            execution.instanceId === where.instanceId &&
            execution.nodeId === where.nodeId,
        ),
      ),
    ),
    create: jest.fn((value) => ({
      id: `node-${executions.length + 1}`,
      ...value,
    })),
    save: jest.fn((value) => {
      executions.push(value);
      return Promise.resolve(value);
    }),
  };
  const manager = {
    getRepository: jest.fn(() => nodeRepository),
    update: jest.fn((_entity, criteria, patch) => {
      if (_entity === Instance) Object.assign(instance, patch);
      const execution = executions.find(
        (item) => item.id === criteria || item.nodeId === criteria.nodeId,
      );
      if (execution) Object.assign(execution, patch);
      return Promise.resolve({ affected: 1 });
    }),
    save: jest.fn((_entity, value) => Promise.resolve(value)),
    create: jest.fn((_entity, value) => value),
    findOne: jest.fn(() => Promise.resolve(instance)),
    transaction: jest.fn((callback) => callback(manager)),
  };
  const instanceRepository = {
    manager,
    findOne: jest.fn(() => Promise.resolve(instance)),
    update: jest.fn((_id, patch) => {
      Object.assign(instance, patch);
      return Promise.resolve({ affected: 1 });
    }),
  } as unknown as Repository<Instance>;
  const assistant = {} as AssistantService;
  const goalValidator = {
    validate: jest.fn(),
  } as unknown as GoalValidatorService;
  const runtime = new RuntimeService(
    instanceRepository,
    assistant,
    goalValidator,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    executions.length = 0;
    Object.assign(instance, {
      status: 'queued',
      currentNodeId: 'check',
      output: {},
      eventSequence: 1,
      startedAt: undefined,
      completedAt: undefined,
    });
    instance.definition.goal = undefined;
  });

  it('completes only after the declared goal is validated', async () => {
    instance.definition.goal = {
      objective: 'Confirm readiness',
      successCriteria: ['The workflow confirms it is ready'],
    };
    jest.spyOn(goalValidator, 'validate').mockResolvedValue({
      satisfied: true,
      reason: 'Readiness is confirmed',
      criteria: [
        {
          criterion: 'The workflow confirms it is ready',
          satisfied: true,
          evidence: 'input.ready is true',
        },
      ],
      validatedAt: new Date().toISOString(),
    });

    await runtime.execute({
      name: 'execute-workflow',
      data: { instanceId: instance.id },
    } as Job<{ instanceId: string }>);

    expect(instance.status).toBe('completed');
    expect(instance.goalValidation?.satisfied).toBe(true);
  });

  it('fails closed when the workflow output does not satisfy its goal', async () => {
    instance.definition.goal = {
      objective: 'Confirm readiness',
      successCriteria: ['The workflow confirms it is ready'],
    };
    jest.spyOn(goalValidator, 'validate').mockResolvedValue({
      satisfied: false,
      reason: 'No confirmation was produced',
      criteria: [
        {
          criterion: 'The workflow confirms it is ready',
          satisfied: false,
          evidence: 'No output contains a confirmation',
        },
      ],
      validatedAt: new Date().toISOString(),
    });

    await runtime.execute({
      name: 'execute-workflow',
      data: { instanceId: instance.id },
    } as Job<{ instanceId: string }>);

    expect(instance.status).toBe('failed');
    expect(instance.error).toContain('Workflow goal was not satisfied');
    expect(instance.goalValidation?.satisfied).toBe(false);
  });

  it('routes a condition and durably completes at the selected end node', async () => {
    await runtime.execute({
      name: 'execute-workflow',
      data: { instanceId: instance.id },
    } as Job<{ instanceId: string }>);

    expect(instance.currentNodeId).toBe('done');
    expect(instance.status).toBe('completed');
    expect(executions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: 'check', status: 'completed' }),
        expect.objectContaining({ nodeId: 'done', status: 'completed' }),
      ]),
    );
  });
});
