import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AiService } from '../../ai/ai.service';
import { buildWorkflowGenerationPrompt } from '../../../shared/ai/prompts';
import { DispatchDto } from '../dto/dispatch.dto';
import type { CreateDefinitionDto } from '../../workflow/dto/create-definition.dto';
import {
  workflowGenerationDecisionJsonSchema,
  workflowGenerationDecisionSchema,
  WorkflowGenerationDecision,
} from '@repo/contracts/schema';

export interface WorkflowPlan {
  reason: string;
  definition: CreateDefinitionDto;
}

@Injectable()
export class PlannerService {
  constructor(private readonly ai: AiService) {}

  async plan(request: DispatchDto): Promise<WorkflowPlan | undefined> {
    const plan = await this.generate(request);
    if (!plan?.requiresWorkflow || plan.stages.length < 2) return undefined;
    return {
      reason: plan.reason,
      definition: {
        key: this.generatedKey(plan.name, request.input!),
        name: plan.name,
        description: plan.description,
        activation: {
          description: plan.description,
          examples: [request.input!],
        },
        goal: {
          objective: request.input!,
          successCriteria: [
            {
              id: 'final-stage-output',
              description:
                'The final workflow stage produced a non-empty result',
              verification: {
                type: 'deterministic',
                source: 'output',
                path: `stage-${plan.stages.length}`,
                operator: 'non_empty',
              },
            },
            ...plan.successCriteria.map((description, index) => ({
              id: `semantic-${index + 1}`,
              description,
              verification: { type: 'model' as const },
            })),
          ],
        },
        graph: {
          startNodeId: 'stage-1',
          nodes: [
            ...plan.stages.map((stage, index) => ({
              id: `stage-${index + 1}`,
              type: 'agent' as const,
              capability: 'chat' as const,
              context: request.context,
              instruction: stage.instruction,
              contextSource: 'task' as const,
              inputSource: 'task' as const,
              browserSessionId: request.browserSessionId,
              browserExecutionTarget: request.browserExecutionTarget,
              executionLane: 'long' as const,
            })),
            { id: 'done', type: 'end' as const },
          ],
          edges: plan.stages.map((_, index) => ({
            from: `stage-${index + 1}`,
            to:
              index === plan.stages.length - 1 ? 'done' : `stage-${index + 2}`,
          })),
        },
      },
    };
  }

  private async generate(
    request: DispatchDto,
  ): Promise<WorkflowGenerationDecision | undefined> {
    try {
      const result = await this.ai.generate({
        messages: buildWorkflowGenerationPrompt({
          capability: request.capability,
          objective: request.input!,
          pageTitle: request.context.title,
          pageUrl: request.context.url,
        }),
        responseSchema: workflowGenerationDecisionJsonSchema,
      });
      return workflowGenerationDecisionSchema.parse(JSON.parse(result.content));
    } catch {
      return undefined;
    }
  }

  private generatedKey(name: string, objective: string): string {
    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) || 'workflow';
    const digest = createHash('sha256')
      .update(objective)
      .digest('hex')
      .slice(0, 8);
    return `generated-${slug}-${digest}`;
  }
}
