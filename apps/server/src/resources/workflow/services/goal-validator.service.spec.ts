import type { WorkflowGoal } from '@repo/contracts/workflow';
import type { AiService } from '../../ai/ai.service';
import { GoalValidatorService } from './goal-validator.service';

describe('GoalValidatorService', () => {
  const ai = { generate: jest.fn() } as unknown as AiService;
  const validator = new GoalValidatorService(ai);
  const semanticGoal: WorkflowGoal = {
    objective: 'Recommend the best laptop',
    successCriteria: [
      {
        id: 'compare-products',
        description: 'At least three laptops are compared',
        verification: { type: 'model' },
      },
      {
        id: 'select-product',
        description: 'One laptop is selected',
        verification: { type: 'model' },
      },
    ],
  };

  beforeEach(() => jest.clearAllMocks());

  it('runs deterministic checks without invoking the model', async () => {
    const goal: WorkflowGoal = {
      objective: 'Produce a final result',
      successCriteria: [
        {
          id: 'final-output',
          description: 'A final result exists',
          verification: {
            type: 'deterministic',
            source: 'output',
            path: 'final.content',
            operator: 'non_empty',
          },
        },
      ],
    };

    await expect(
      validator.validate(goal, {}, { final: { content: 'done' } }),
    ).resolves.toMatchObject({ satisfied: true });
    expect(ai.generate).not.toHaveBeenCalled();
  });

  it('short-circuits semantic evaluation when a deterministic check fails', async () => {
    const goal: WorkflowGoal = {
      objective: 'Produce and assess a result',
      successCriteria: [
        {
          id: 'final-output',
          description: 'A final result exists',
          verification: {
            type: 'deterministic',
            source: 'output',
            path: 'final',
            operator: 'non_empty',
          },
        },
        {
          id: 'quality',
          description: 'The result is well supported',
          verification: { type: 'model' },
        },
      ],
    };

    await expect(validator.validate(goal, {}, {})).resolves.toMatchObject({
      satisfied: false,
      criteria: [
        { criterionId: 'final-output', satisfied: false },
        { criterionId: 'quality', satisfied: false },
      ],
    });
    expect(ai.generate).not.toHaveBeenCalled();
  });

  it('uses the model only for semantic criteria', async () => {
    jest.spyOn(ai, 'generate').mockResolvedValue({
      provider: 'test',
      model: 'test',
      content: JSON.stringify({
        satisfied: true,
        reason: 'Both criteria have direct evidence',
        criteria: semanticGoal.successCriteria.map((criterion) => ({
          criterionId: criterion.id,
          satisfied: true,
          evidence: `Evidence for ${criterion.id}`,
        })),
      }),
    });

    await expect(
      validator.validate(semanticGoal, {}, { final: 'result' }),
    ).resolves.toMatchObject({ satisfied: true });
    expect(ai.generate).toHaveBeenCalledTimes(1);
  });

  it('cannot report success when any semantic criterion failed', async () => {
    jest.spyOn(ai, 'generate').mockResolvedValue({
      provider: 'test',
      model: 'test',
      content: JSON.stringify({
        satisfied: true,
        reason: 'A recommendation was attempted',
        criteria: [
          {
            criterionId: 'compare-products',
            satisfied: false,
            evidence: 'Only one laptop is present',
          },
          {
            criterionId: 'select-product',
            satisfied: true,
            evidence: 'Laptop A is selected',
          },
        ],
      }),
    });

    await expect(
      validator.validate(semanticGoal, {}, {}),
    ).resolves.toMatchObject({
      satisfied: false,
    });
  });

  it('rejects reordered criterion IDs', async () => {
    jest.spyOn(ai, 'generate').mockResolvedValue({
      provider: 'test',
      model: 'test',
      content: JSON.stringify({
        satisfied: true,
        reason: 'Done',
        criteria: semanticGoal.successCriteria
          .slice()
          .reverse()
          .map((criterion) => ({
            criterionId: criterion.id,
            satisfied: true,
            evidence: 'evidence',
          })),
      }),
    });

    await expect(validator.validate(semanticGoal, {}, {})).rejects.toThrow(
      'Invalid workflow goal criterion result',
    );
  });
});
