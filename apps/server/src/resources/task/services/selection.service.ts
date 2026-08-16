import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../../ai/ai.service';
import { AssistantService } from '../../assistant/services/assistant.service';
import { buildWorkflowSelectionPrompt } from '../../../shared/ai/prompts';
import { DispatchDto } from '../dto/dispatch.dto';
import { Definition } from '../../workflow/entities/definition.entity';
import { WorkflowService } from '../../workflow/services/workflow.service';

interface SelectionDecision {
  workflowDefinitionId?: string | null;
  confidence: number;
  requiresMultipleSteps: boolean;
  reason: string;
}

@Injectable()
export class SelectionService {
  constructor(
    @InjectRepository(Definition)
    private readonly definitions: Repository<Definition>,
    private readonly ai: AiService,
    private readonly assistant: AssistantService,
    private readonly workflows: WorkflowService,
  ) {}

  async dispatch(userId: number, request: DispatchDto) {
    if (request.selectionMode === 'assistant') {
      return this.startAssistant(userId, request, 'explicit_assistant');
    }
    if (request.selectionMode === 'workflow') {
      if (!request.workflowDefinitionId) {
        throw new BadRequestException('A workflow definition is required');
      }
      return this.startWorkflow(
        userId,
        request.workflowDefinitionId,
        request,
        'explicit_workflow',
      );
    }

    const candidates = await this.findCandidates(userId);
    if (candidates.length === 0 || !request.input?.trim()) {
      return this.startAssistant(userId, request, 'no_workflow_candidate');
    }

    const decision = await this.select(request, candidates);
    const selected = candidates.find(
      (candidate) => candidate.id === decision.workflowDefinitionId,
    );
    if (
      !selected ||
      !decision.requiresMultipleSteps ||
      decision.confidence < 0.75
    ) {
      return this.startAssistant(userId, request, decision.reason);
    }
    return this.startWorkflow(userId, selected.id, request, decision.reason);
  }

  private async findCandidates(userId: number): Promise<Definition[]> {
    const definitions = await this.definitions.find({
      where: { userId },
      order: { version: 'DESC' },
    });
    const latest = new Map<string, Definition>();
    for (const definition of definitions) {
      if (!latest.has(definition.key)) {
        latest.set(definition.key, definition);
      }
    }
    return [...latest.values()].filter((definition) => definition.activation);
  }

  private async select(
    request: DispatchDto,
    candidates: Definition[],
  ): Promise<SelectionDecision> {
    try {
      const messages = buildWorkflowSelectionPrompt({
        task: {
          capability: request.capability,
          input: request.input,
          pageTitle: request.context.title,
          pageUrl: request.context.url,
        },
        candidates: candidates.map((candidate) => ({
          id: candidate.id,
          name: candidate.name,
          description: candidate.activation?.description,
          examples: candidate.activation?.examples,
        })),
      });
      const result = await this.ai.generate({
        messages,
        responseSchema: {
          type: 'object',
          additionalProperties: false,
          required: [
            'workflowDefinitionId',
            'confidence',
            'requiresMultipleSteps',
            'reason',
          ],
          properties: {
            workflowDefinitionId: { type: ['string', 'null'] },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            requiresMultipleSteps: { type: 'boolean' },
            reason: { type: 'string' },
          },
        },
      });
      const decision = JSON.parse(result.content) as SelectionDecision;
      if (
        typeof decision.confidence !== 'number' ||
        typeof decision.requiresMultipleSteps !== 'boolean' ||
        typeof decision.reason !== 'string' ||
        (decision.workflowDefinitionId !== null &&
          typeof decision.workflowDefinitionId !== 'string')
      ) {
        throw new Error('Invalid workflow selection response');
      }
      return decision;
    } catch {
      return this.selectLexically(request.input ?? '', candidates);
    }
  }

  private selectLexically(
    objective: string,
    candidates: Definition[],
  ): SelectionDecision {
    const words = new Set(this.words(objective));
    const multiStage =
      /\b(and then|then|every|monitor|compare|research|track|across)\b/i.test(
        objective,
      );
    let best: Definition | undefined;
    let bestScore = 0;
    for (const candidate of candidates) {
      const candidateWords = this.words(
        [
          candidate.activation?.description,
          ...(candidate.activation?.examples ?? []),
        ]
          .filter(Boolean)
          .join(' '),
      );
      const matches = candidateWords.filter((word) => words.has(word)).length;
      const score = candidateWords.length ? matches / candidateWords.length : 0;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return {
      workflowDefinitionId: bestScore >= 0.25 ? best?.id : undefined,
      confidence: multiStage && bestScore >= 0.25 ? 0.8 : 0,
      requiresMultipleSteps: multiStage,
      reason: 'deterministic_fallback',
    };
  }

  private words(value: string): string[] {
    return value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  }

  private async startAssistant(
    userId: number,
    request: DispatchDto,
    reason: string,
  ) {
    const response = await this.assistant.createRun(userId, request);
    return {
      message: response.message,
      data: { kind: 'run', reason, ...response.data },
    };
  }

  private async startWorkflow(
    userId: number,
    definitionId: string,
    request: DispatchDto,
    reason: string,
  ) {
    const response = await this.workflows.start(userId, definitionId, {
      input: { task: this.taskInput(request) },
    });
    return {
      message: response.message,
      data: { kind: 'workflow', reason, ...response.data },
    };
  }

  private taskInput(request: DispatchDto) {
    return {
      capability: request.capability,
      context: request.context,
      input: request.input,
      options: request.options,
      browserSessionId: request.browserSessionId,
      browserExecutionTarget: request.browserExecutionTarget,
      executionLane: request.executionLane,
    };
  }
}
