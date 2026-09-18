import type { AiAssistantCapability } from '@repo/contracts/assistant';
import type { ContextIntent } from '@repo/contracts/context';

const INTENT_PATTERNS: ReadonlyArray<{
  readonly intent: Exclude<ContextIntent, 'read'>;
  readonly pattern: RegExp;
}> = [
  {
    intent: 'submit',
    pattern:
      /\b(submit|send|publish|post|buy|purchase|pay|checkout|place order|sign in|log in|register|subscribe|confirm)\b/i,
  },
  {
    intent: 'edit',
    pattern:
      /\b(fill|enter|type|write|edit|change|select|choose|check|uncheck|toggle|upload|paste)\b/i,
  },
  {
    intent: 'navigate',
    pattern:
      /\b(click|open|go to|navigate|visit|follow|download|next page|previous page)\b/i,
  },
  {
    intent: 'compare',
    pattern: /\b(compare|difference|versus|vs\.?|cheaper|better|best|rank)\b/i,
  },
  {
    intent: 'extract',
    pattern:
      /\b(extract|collect|list all|table|spreadsheet|csv|json|all rows|all results)\b/i,
  },
  {
    intent: 'locate',
    pattern: /\b(find|where|locate|search|look for|which section)\b/i,
  },
];

export const classifyContextIntent = (
  capability: AiAssistantCapability,
  userInput?: string,
): ContextIntent => {
  if (capability !== 'chat') return 'read';
  const request = userInput?.trim() ?? '';
  return (
    INTENT_PATTERNS.find(({ pattern }) => pattern.test(request))?.intent ??
    'read'
  );
};

export const isInteractionIntent = (intent: ContextIntent): boolean =>
  intent === 'navigate' || intent === 'edit' || intent === 'submit';
