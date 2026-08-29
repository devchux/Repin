import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../../ai/ai.service';
import { Definition } from '../../workflow/entities/definition.entity';
import { buildWorkflowSelectionPrompt } from '../../../shared/ai/prompts';
import { DispatchDto } from '../dto/dispatch.dto';
import { getWordsList } from 'src/shared/utils/helper';
import {
  workflowSelectionDecisionJsonSchema,
  workflowSelectionDecisionSchema,
  WorkflowSelectionDecision,
} from '@repo/contracts/schema';

type SelectionDecision = Omit<
  WorkflowSelectionDecision,
  'workflowDefinitionId'
> & { workflowDefinitionId?: string | null };

export interface WorkflowSelection {
  decision: SelectionDecision;
  definition?: Definition;
}

@Injectable()
export class SelectorService {
  constructor(
    @InjectRepository(Definition)
    private readonly definitions: Repository<Definition>,
    private readonly ai: AiService,
  ) {}

  async select(
    userId: number,
    request: DispatchDto,
  ): Promise<WorkflowSelection> {
    const candidates = await this.findCandidates(userId);
    if (candidates.length === 0) {
      return {
        decision: {
          confidence: 1,
          requiresMultipleSteps: true,
          reason: 'no_workflow_candidate',
        },
      };
    }
    const decision = await this.selectCandidate(request, candidates);
    return {
      decision,
      definition: candidates.find(
        (candidate) => candidate.id === decision.workflowDefinitionId,
      ),
    };
  }

  private async findCandidates(userId: number): Promise<Definition[]> {
    const definitions = await this.definitions.find({
      where: { userId },
      order: { version: 'DESC' },
    });
    const latest = new Map<string, Definition>();
    for (const definition of definitions) {
      if (!latest.has(definition.key)) latest.set(definition.key, definition);
    }
    return [...latest.values()].filter((definition) => definition.activation);
  }

  private async selectCandidate(
    request: DispatchDto,
    candidates: Definition[],
  ): Promise<SelectionDecision> {
    try {
      const result = await this.ai.generate({
        messages: buildWorkflowSelectionPrompt({
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
        }),
        responseSchema: workflowSelectionDecisionJsonSchema,
      });
      return workflowSelectionDecisionSchema.parse(JSON.parse(result.content));
    } catch {
      return this.selectLexically(request.input ?? '', candidates);
    }
  }

  private selectLexically(
    objective: string,
    candidates: Definition[],
  ): SelectionDecision {
    const words = new Set(getWordsList(objective));
    const multiStage =
      /\b(and then|then|every|monitor|compare|research|track|across)\b/i.test(
        objective,
      );
    let best: Definition | undefined;
    let bestScore = 0;
    for (const candidate of candidates) {
      const candidateWords = getWordsList(
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
}
