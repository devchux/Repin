import { Injectable } from '@nestjs/common';
import type {
  WorkflowGoal,
  WorkflowGoalEvaluation,
  WorkflowGoalCriterionResult,
  WorkflowSuccessCriterion,
  WorkflowGoalValidation,
} from '@repo/contracts/workflow';
import {
  workflowGoalEvaluationJsonSchema,
  workflowGoalEvaluationSchema,
} from '@repo/contracts/workflow';
import { AiService } from '../../ai/ai.service';
import { buildWorkflowGoalValidationPrompt } from '../../../shared/ai/prompts';
import { isDeepStrictEqual } from 'node:util';

@Injectable()
export class GoalValidatorService {
  constructor(private readonly ai: AiService) {}

  async validate(
    goal: WorkflowGoal,
    input: Readonly<Record<string, unknown>>,
    output: Readonly<Record<string, unknown>>,
  ): Promise<WorkflowGoalValidation> {
    const deterministicCriteria = goal.successCriteria.filter(
      (criterion) => criterion.verification.type === 'deterministic',
    );
    const deterministicResults = deterministicCriteria.map((criterion) =>
      this.evaluateDeterministically(criterion, input, output),
    );
    if (deterministicResults.some((result) => !result.satisfied)) {
      return this.complete(
        goal,
        deterministicResults,
        'One or more deterministic success criteria failed',
      );
    }

    const modelCriteria = goal.successCriteria.filter(
      (criterion) => criterion.verification.type === 'model',
    );
    if (modelCriteria.length === 0) {
      return this.complete(
        goal,
        deterministicResults,
        'Every deterministic success criterion passed',
      );
    }

    const result = await this.ai.generate({
      messages: buildWorkflowGoalValidationPrompt({
        objective: goal.objective,
        successCriteria: modelCriteria.map(({ id, description }) => ({
          id,
          description,
        })),
        serializedWorkflowInput: JSON.stringify(input).slice(0, 20_000),
        serializedWorkflowOutput: JSON.stringify(output).slice(0, 50_000),
      }),
      responseSchema: workflowGoalEvaluationJsonSchema,
    });
    const evaluation = this.parse(result.content, modelCriteria);
    return this.complete(
      goal,
      [...deterministicResults, ...evaluation.criteria],
      evaluation.reason,
      evaluation.satisfied,
    );
  }

  private parse(
    content: string,
    criteria: readonly WorkflowSuccessCriterion[],
  ): WorkflowGoalEvaluation {
    const parsed = workflowGoalEvaluationSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      throw new Error('Invalid workflow goal validation response');
    }
    const value = parsed.data;
    if (value.criteria.length !== criteria.length) {
      throw new Error('Invalid workflow goal validation response');
    }
    const results = criteria.map((criterion, index) => {
      const result = value.criteria[index];
      if (result.criterionId !== criterion.id) {
        throw new Error('Invalid workflow goal criterion result');
      }
      return result;
    });
    const allCriteriaSatisfied = results.every((item) => item.satisfied);
    return {
      satisfied: value.satisfied && allCriteriaSatisfied,
      reason: value.reason,
      criteria: results,
    };
  }

  private evaluateDeterministically(
    criterion: WorkflowSuccessCriterion,
    input: Readonly<Record<string, unknown>>,
    output: Readonly<Record<string, unknown>>,
  ): WorkflowGoalCriterionResult {
    if (criterion.verification.type !== 'deterministic') {
      throw new Error(
        'A model criterion cannot be evaluated deterministically',
      );
    }
    const strategy = criterion.verification;
    const root = strategy.source === 'input' ? input : output;
    const value = this.readPath(root, strategy.path);
    let satisfied = false;
    switch (strategy.operator) {
      case 'exists':
        satisfied = value !== undefined;
        break;
      case 'non_empty':
        satisfied = this.isNonEmpty(value);
        break;
      case 'equals':
        satisfied = isDeepStrictEqual(value, strategy.expected);
        break;
      case 'contains':
        satisfied = this.contains(value, strategy.expected);
        break;
    }
    return {
      criterionId: criterion.id,
      satisfied,
      evidence: `${strategy.source}.${strategy.path} ${satisfied ? 'satisfied' : 'did not satisfy'} ${strategy.operator}; observed ${this.describe(value)}`,
    };
  }

  private complete(
    goal: WorkflowGoal,
    evaluated: readonly WorkflowGoalCriterionResult[],
    reason: string,
    aggregateSatisfied = true,
  ): WorkflowGoalValidation {
    const byId = new Map(
      evaluated.map((result) => [result.criterionId, result]),
    );
    const criteria = goal.successCriteria.map(
      (criterion): WorkflowGoalCriterionResult =>
        byId.get(criterion.id) ?? {
          criterionId: criterion.id,
          satisfied: false,
          evidence: 'Not evaluated because a deterministic prerequisite failed',
        },
    );
    return {
      satisfied:
        aggregateSatisfied &&
        criteria.every((criterion) => criterion.satisfied),
      reason,
      criteria,
      validatedAt: new Date().toISOString(),
    };
  }

  private readPath(root: unknown, path: string): unknown {
    return path
      .split('.')
      .reduce<unknown>(
        (current, part) =>
          current !== null && typeof current === 'object'
            ? (current as Record<string, unknown>)[part]
            : undefined,
        root,
      );
  }

  private isNonEmpty(value: unknown): boolean {
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (value !== null && typeof value === 'object') {
      return Object.keys(value).length > 0;
    }
    return value !== undefined && value !== null;
  }

  private contains(value: unknown, expected: unknown): boolean {
    if (typeof value === 'string' && typeof expected === 'string') {
      return value.includes(expected);
    }
    return Array.isArray(value)
      ? value.some((item) => isDeepStrictEqual(item, expected))
      : false;
  }

  private describe(value: unknown): string {
    const serialized = JSON.stringify(value);
    return (serialized ?? String(value)).slice(0, 500);
  }
}
