import { Injectable } from '@nestjs/common';
import type { AiAssistantCapability } from '@repo/contracts/assistant';
import type {
  ContextBundle,
  ContextItem,
  PageObservation,
} from '@repo/contracts/context';
import type { PageContext } from '@repo/contracts/browser';

const DEFAULT_CONTEXT_TOKEN_BUDGET = 12_000;
const APPROXIMATE_CHARACTERS_PER_TOKEN = 4;

export interface AssembleContextInput {
  readonly capability: AiAssistantCapability;
  readonly page: PageContext;
  readonly userInput?: string;
  readonly observation?: PageObservation;
  readonly maximumTokens?: number;
}

@Injectable()
export class ContextAssemblerService {
  assemble(input: AssembleContextInput): ContextBundle {
    const observation = input.observation ?? input.page.observation;
    const maximumTokens = Math.max(
      1,
      input.maximumTokens ?? DEFAULT_CONTEXT_TOKEN_BUDGET,
    );
    const maximumCharacters = maximumTokens * APPROXIMATE_CHARACTERS_PER_TOKEN;
    const candidates = this.candidates(input, observation);
    const items: ContextItem[] = [];
    let remainingCharacters = maximumCharacters;

    for (const candidate of candidates) {
      if (remainingCharacters <= 0) break;
      const content = candidate.content.slice(0, remainingCharacters);
      if (!content) continue;
      items.push({ ...candidate, content });
      remainingCharacters -= content.length;
      if (content.length < candidate.content.length) break;
    }

    const includedCharacters = items.reduce(
      (total, item) => total + item.content.length,
      0,
    );
    const truncated =
      candidates.length > items.length ||
      items.some(
        (item, index) => item.content.length < candidates[index].content.length,
      ) ||
      Boolean(observation?.truncated);

    return {
      page: { url: input.page.url, title: input.page.title },
      items,
      manifest: {
        strategy: this.strategy(input, observation),
        includedItemIds: items.map((item) => item.id),
        omittedItemCount: Math.max(0, candidates.length - items.length),
        truncated,
        estimatedTokens: Math.ceil(
          includedCharacters / APPROXIMATE_CHARACTERS_PER_TOKEN,
        ),
        sourceObservationIds: observation ? [observation.observationId] : [],
      },
    };
  }

  private candidates(
    input: AssembleContextInput,
    observation?: PageObservation,
  ): ContextItem[] {
    if (input.page.selectedText) {
      return [
        {
          id: 'selection',
          provenance: 'user_selection',
          content: input.page.selectedText,
          untrusted: true,
        },
      ];
    }

    if (observation) {
      return this.rankBlocks(input, observation)
        .filter((block) => block.visible && block.text.trim())
        .map((block) => ({
          id: block.id,
          provenance: 'webpage' as const,
          content: block.text,
          untrusted: true,
          blockKind: block.kind,
          headingPath: block.headingPath,
        }));
    }

    return input.page.pageContent
      ? [
          {
            id: 'legacy-page-content',
            provenance: 'webpage',
            content: input.page.pageContent,
            untrusted: true,
          },
        ]
      : [];
  }

  private strategy(
    input: AssembleContextInput,
    observation?: PageObservation,
  ): ContextBundle['manifest']['strategy'] {
    if (input.page.selectedText) return 'selection';
    if (!observation) return 'whole_document';
    return input.userInput?.trim() &&
      (input.capability === 'chat' || input.capability === 'explain')
      ? 'retrieval'
      : 'semantic_blocks';
  }

  private rankBlocks(
    input: AssembleContextInput,
    observation: PageObservation,
  ): PageObservation['blocks'] {
    const visibleBlocks = observation.blocks.filter(
      (block) => block.visible && block.text.trim(),
    );

    if (input.capability === 'summarize') {
      const headings: typeof visibleBlocks = [];
      const firstSectionBlocks: typeof visibleBlocks = [];
      const secondSectionBlocks: typeof visibleBlocks = [];
      const remainder: typeof visibleBlocks = [];
      let contentBlocksInSection = 0;
      for (const block of visibleBlocks) {
        if (block.kind === 'heading') {
          contentBlocksInSection = 0;
          headings.push(block);
        } else if (block.kind === 'navigation') {
          remainder.push(block);
        } else if (contentBlocksInSection === 0) {
          firstSectionBlocks.push(block);
          contentBlocksInSection += 1;
        } else if (contentBlocksInSection === 1) {
          secondSectionBlocks.push(block);
          contentBlocksInSection += 1;
        } else {
          remainder.push(block);
        }
      }
      return [
        ...headings,
        ...firstSectionBlocks,
        ...secondSectionBlocks,
        ...remainder,
      ];
    }

    const queryTerms = this.queryTerms(input.userInput);
    if (
      queryTerms.length === 0 ||
      (input.capability !== 'chat' && input.capability !== 'explain')
    ) {
      return visibleBlocks;
    }

    return visibleBlocks
      .map((block, index) => ({
        block,
        index,
        score:
          queryTerms.reduce((score, term) => {
            const text = `${block.headingPath?.join(' ') ?? ''} ${block.text}`
              .toLocaleLowerCase()
              .split(term).length;
            return score + Math.max(0, text - 1);
          }, 0) +
          (block.inViewport ? 1 : 0) +
          (block.kind === 'heading' ? 0.5 : 0),
      }))
      .sort(
        (left, right) => right.score - left.score || left.index - right.index,
      )
      .map(({ block }) => block);
  }

  private queryTerms(input?: string): readonly string[] {
    if (!input) return [];
    return [
      ...new Set(
        input
          .toLocaleLowerCase()
          .match(/[\p{L}\p{N}]{3,}/gu)
          ?.filter(
            (term) =>
              !['about', 'from', 'that', 'this', 'what', 'with'].includes(term),
          ) ?? [],
      ),
    ].slice(0, 20);
  }
}
