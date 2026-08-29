import { Injectable } from '@nestjs/common';
import type {
  WorkflowGoal,
  WorkflowGoalEvaluation,
  WorkflowGoalValidation,
} from '@repo/contracts/workflow';
import {
  workflowGoalEvaluationJsonSchema,
  workflowGoalEvaluationSchema,
} from '@repo/contracts/workflow';
import { AiService } from '../../ai/ai.service';
import { buildWorkflowGoalValidationPrompt } from '../../../shared/ai/prompts';

@Injectable()
export class GoalValidatorService {
  constructor(private readonly ai: AiService) {}

  async validate(
    goal: WorkflowGoal,
    input: Readonly<Record<string, unknown>>,
    output: Readonly<Record<string, unknown>>,
  ): Promise<WorkflowGoalValidation> {
    const result = await this.ai.generate({
      messages: buildWorkflowGoalValidationPrompt({
        objective: goal.objective,
        successCriteria: goal.successCriteria,
        serializedWorkflowInput: JSON.stringify(input).slice(0, 20_000),
        serializedWorkflowOutput: JSON.stringify(output).slice(0, 50_000),
      }),
      responseSchema: workflowGoalEvaluationJsonSchema,
    });
    const evaluation = this.parse(result.content, goal);
    return { ...evaluation, validatedAt: new Date().toISOString() };
  }

  private parse(content: string, goal: WorkflowGoal): WorkflowGoalEvaluation {
    const parsed = workflowGoalEvaluationSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      throw new Error('Invalid workflow goal validation response');
    }
    const value = parsed.data;
    if (value.criteria.length !== goal.successCriteria.length) {
      throw new Error('Invalid workflow goal validation response');
    }
    const criteria = goal.successCriteria.map((criterion, index) => {
      const result = value.criteria[index];
      if (result.criterion !== criterion) {
        throw new Error('Invalid workflow goal criterion result');
      }
      return result;
    });
    const allCriteriaSatisfied = criteria.every((item) => item.satisfied);
    return {
      satisfied: value.satisfied && allCriteriaSatisfied,
      reason: value.reason,
      criteria,
    };
  }
}
