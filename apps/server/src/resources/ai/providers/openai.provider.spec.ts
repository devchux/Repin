import { normalizeOpenAiFinishReason } from './openai.provider';

describe('normalizeOpenAiFinishReason', () => {
  it.each([
    ['stop', { endTurn: true, stopReason: 'complete' }],
    ['tool_calls', { endTurn: false, stopReason: 'tool_calls' }],
    ['function_call', { endTurn: false, stopReason: 'tool_calls' }],
    ['length', { endTurn: false, stopReason: 'length' }],
    ['content_filter', { endTurn: true, stopReason: 'content_filter' }],
    [undefined, { stopReason: 'unknown' }],
  ])('normalizes %s', (reason, expected) => {
    expect(normalizeOpenAiFinishReason(reason)).toEqual(expected);
  });
});
