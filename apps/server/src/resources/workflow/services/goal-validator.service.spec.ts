import type { AiService } from '../../ai/ai.service';
import { GoalValidatorService } from './goal-validator.service';

describe('GoalValidatorService', () => {
  const ai = { generate: jest.fn() } as unknown as AiService;
  const validator = new GoalValidatorService(ai);
  const goal = {
    objective: 'Recommend the best laptop',
    successCriteria: ['At least three laptops are compared', 'One is selected'],
  };

  it('accepts a result only when every declared criterion is satisfied', async () => {
    jest.spyOn(ai, 'generate').mockResolvedValue({
      provider: 'test',
      model: 'test',
      content: JSON.stringify({
        satisfied: true,
        reason: 'Both criteria have direct evidence',
        criteria: [
          {
            criterion: goal.successCriteria[0],
            satisfied: true,
            evidence: 'The output compares A, B, and C',
          },
          {
            criterion: goal.successCriteria[1],
            satisfied: true,
            evidence: 'The output selects B',
          },
        ],
      }),
    });

    await expect(
      validator.validate(goal, {}, { final: 'result' }),
    ).resolves.toMatchObject({
      satisfied: true,
      criteria: [{ satisfied: true }, { satisfied: true }],
    });
  });

  it('cannot report success when any individual criterion failed', async () => {
    jest.spyOn(ai, 'generate').mockResolvedValue({
      provider: 'test',
      model: 'test',
      content: JSON.stringify({
        satisfied: true,
        reason: 'A recommendation was attempted',
        criteria: [
          {
            criterion: goal.successCriteria[0],
            satisfied: false,
            evidence: 'Only one laptop is present',
          },
          {
            criterion: goal.successCriteria[1],
            satisfied: true,
            evidence: 'Laptop A is selected',
          },
        ],
      }),
    });

    await expect(validator.validate(goal, {}, {})).resolves.toMatchObject({
      satisfied: false,
    });
  });

  it('rejects reordered criteria so evidence cannot be attached ambiguously', async () => {
    jest.spyOn(ai, 'generate').mockResolvedValue({
      provider: 'test',
      model: 'test',
      content: JSON.stringify({
        satisfied: true,
        reason: 'Done',
        criteria: goal.successCriteria
          .slice()
          .reverse()
          .map((criterion) => ({ criterion, satisfied: true, evidence: 'x' })),
      }),
    });

    await expect(validator.validate(goal, {}, {})).rejects.toThrow(
      'Invalid workflow goal criterion result',
    );
  });

  it('rejects structurally invalid model output before domain evaluation', async () => {
    jest.spyOn(ai, 'generate').mockResolvedValue({
      provider: 'test',
      model: 'test',
      content: JSON.stringify({
        satisfied: true,
        reason: 'Done',
        criteria: [
          {
            criterion: goal.successCriteria[0],
            satisfied: true,
          },
        ],
      }),
    });

    await expect(validator.validate(goal, {}, {})).rejects.toThrow(
      'Invalid workflow goal validation response',
    );
  });
});
