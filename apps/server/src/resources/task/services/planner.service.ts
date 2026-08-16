import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AiService } from '../../ai/ai.service';
import { buildWorkflowGenerationPrompt } from '../../../shared/ai/prompts';
import { DispatchDto } from '../dto/dispatch.dto';
import type { CreateDefinitionDto } from '../../workflow/dto/create-definition.dto';

interface GenerationDecision {
  requiresWorkflow: boolean;
  reason: string;
  name: string;
  description: string;
  stages: { instruction: string }[];
}

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
  ): Promise<GenerationDecision | undefined> {
    try {
      const result = await this.ai.generate({
        messages: buildWorkflowGenerationPrompt({
          capability: request.capability,
          objective: request.input!,
          pageTitle: request.context.title,
          pageUrl: request.context.url,
        }),
        responseSchema: {
          type: 'object',
          additionalProperties: false,
          required: [
            'requiresWorkflow',
            'reason',
            'name',
            'description',
            'stages',
          ],
          properties: {
            requiresWorkflow: { type: 'boolean' },
            reason: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            stages: {
              type: 'array',
              minItems: 0,
              maxItems: 8,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['instruction'],
                properties: { instruction: { type: 'string' } },
              },
            },
          },
        },
      });
      const plan = JSON.parse(result.content) as GenerationDecision;
      if (
        typeof plan.requiresWorkflow !== 'boolean' ||
        typeof plan.reason !== 'string' ||
        typeof plan.name !== 'string' ||
        typeof plan.description !== 'string' ||
        !Array.isArray(plan.stages) ||
        plan.stages.length > 8 ||
        plan.stages.some(
          (stage) =>
            typeof stage.instruction !== 'string' ||
            !stage.instruction.trim() ||
            stage.instruction.length > 2_000,
        )
      )
        return undefined;
      return plan;
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
