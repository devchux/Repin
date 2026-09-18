import { Injectable } from '@nestjs/common';
import type { AiAssistantCapability } from '@repo/contracts/assistant';
import type {
  ContextBundle,
  ContextItem,
  PageObservation,
} from '@repo/contracts/context';
import type { PageContext } from '@repo/contracts/browser';
import { classifyContextIntent, isInteractionIntent } from './context-intent';

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
    const intent = classifyContextIntent(input.capability, input.userInput);
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
        intent,
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
      const intent = classifyContextIntent(input.capability, input.userInput);
      const blocks = this.rankBlocks(input, observation)
        .filter((block) => block.visible && block.text.trim())
        .map((block) => ({
          id: block.id,
          provenance: 'webpage' as const,
          content: block.text,
          untrusted: true,
          blockKind: block.kind,
          headingPath: block.headingPath,
          structure: block.structure,
        }));
      const controls = this.rankInteractiveElements(input, observation).map(
        (element): ContextItem => {
          const ambiguous = this.isAmbiguousControl(element, observation);
          const actionRef = ambiguous ? undefined : element.actionRef;
          return {
            id: element.id,
            provenance: 'webpage',
            content: this.describeInteractiveElement(element),
            untrusted: true,
            headingPath: element.headingPath,
            interactiveElement: {
              kind: element.kind,
              role: element.role,
              name: element.name,
              description: element.description,
              value: element.value,
              inputType: element.inputType,
              href: element.href,
              headingPath: element.headingPath,
              disabled: element.disabled,
              checked: element.checked,
              expanded: element.expanded,
              required: element.required,
              validationMessage: element.validationMessage,
              invalid: element.invalid,
              selected: element.selected,
              formId: element.formId,
              dialogId: element.dialogId,
              regionRole: element.regionRole,
            },
            actionRef,
            documentRevision: actionRef
              ? observation.documentRevision
              : undefined,
            groundingStatus: ambiguous
              ? 'ambiguous'
              : actionRef
                ? 'grounded'
                : 'unavailable',
            riskTags: this.interactiveRiskTags(element),
          };
        },
      );
      const rankedBlocks = blocks.map((block) => ({
        ...block,
        riskTags: this.contentRiskTags(block.content),
      }));
      return this.shouldPrioritizeControls(intent, input.userInput)
        ? [...controls, ...rankedBlocks]
        : [...rankedBlocks, ...controls];
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
    const intent = classifyContextIntent(input.capability, input.userInput);
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
          this.termScore(
            `${block.headingPath?.join(' ') ?? ''} ${block.text}`,
            queryTerms,
          ) +
          (block.inViewport ? 1 : 0) +
          (block.kind === 'heading' ? 0.5 : 0) +
          (intent === 'extract' && ['table', 'list'].includes(block.kind)
            ? 3
            : 0) +
          (intent === 'compare' && block.kind === 'heading' ? 2 : 0),
      }))
      .sort(
        (left, right) => right.score - left.score || left.index - right.index,
      )
      .map(({ block }) => block);
  }

  private rankInteractiveElements(
    input: AssembleContextInput,
    observation: PageObservation,
  ): NonNullable<PageObservation['interactiveElements']> {
    const queryTerms = this.queryTerms(input.userInput);
    return [...(observation.interactiveElements ?? [])]
      .filter((element) => element.visible && (element.name || element.value))
      .map((element, index) => ({
        element,
        index,
        score:
          this.termScore(
            `${element.headingPath?.join(' ') ?? ''} ${element.name} ${element.value ?? ''} ${element.role}`,
            queryTerms,
          ) +
          (element.inViewport ? 1 : 0) +
          (element.disabled ? -2 : 0),
      }))
      .sort(
        (left, right) => right.score - left.score || left.index - right.index,
      )
      .map(({ element }) => element);
  }

  private describeInteractiveElement(
    element: NonNullable<PageObservation['interactiveElements']>[number],
  ): string {
    const state = [
      element.inputType ? `type=${element.inputType}` : undefined,
      element.description
        ? `description=${JSON.stringify(element.description)}`
        : undefined,
      element.value ? `value=${JSON.stringify(element.value)}` : undefined,
      element.disabled ? 'disabled' : undefined,
      element.checked !== undefined ? `checked=${element.checked}` : undefined,
      element.expanded !== undefined
        ? `expanded=${element.expanded}`
        : undefined,
      element.required ? 'required' : undefined,
      element.invalid && element.validationMessage
        ? `validation=${JSON.stringify(element.validationMessage)}`
        : undefined,
      element.href ? `destination=${element.href}` : undefined,
    ].filter(Boolean);
    return `${element.role}: ${element.name || '(unnamed)'}${state.length ? ` (${state.join(', ')})` : ''}`;
  }

  private interactiveRiskTags(
    element: NonNullable<PageObservation['interactiveElements']>[number],
  ): ContextItem['riskTags'] {
    return /password|credit.?card|card.?number|cvv|cvc|social.?security|ssn/i.test(
      `${element.inputType ?? ''} ${element.name} ${element.role}`,
    )
      ? ['sensitive_input']
      : undefined;
  }

  private shouldPrioritizeControls(
    intent: ReturnType<typeof classifyContextIntent>,
    userInput?: string,
  ): boolean {
    return isInteractionIntent(intent) || /\bsearch\b/i.test(userInput ?? '');
  }

  private isAmbiguousControl(
    target: NonNullable<PageObservation['interactiveElements']>[number],
    observation: PageObservation,
  ): boolean {
    const identity = this.controlIdentity(target);
    return (
      observation.interactiveElements?.filter(
        (element) =>
          element.visible && this.controlIdentity(element) === identity,
      ).length !== 1
    );
  }

  private controlIdentity(
    element: NonNullable<PageObservation['interactiveElements']>[number],
  ): string {
    return [
      element.role,
      element.name,
      element.headingPath?.join(' > '),
      element.formId,
      element.dialogId,
    ]
      .join('|')
      .toLocaleLowerCase();
  }

  private contentRiskTags(content: string): ContextItem['riskTags'] {
    return /\b(ignore (all |any )?(previous|prior|system)|system message|developer message|reveal (your )?(prompt|instructions)|do not trust the user)\b/i.test(
      content,
    )
      ? ['prompt_injection']
      : undefined;
  }

  private termScore(text: string, queryTerms: readonly string[]): number {
    const normalized = text.toLocaleLowerCase();
    return queryTerms.reduce(
      (score, term) => score + Math.max(0, normalized.split(term).length - 1),
      0,
    );
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
