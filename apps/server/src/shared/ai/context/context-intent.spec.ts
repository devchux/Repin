import { classifyContextIntent, isInteractionIntent } from './context-intent';

describe('context intent', () => {
  it.each([
    ['Find the refund policy', 'locate'],
    ['Open the pricing page', 'navigate'],
    ['Fill in my address', 'edit'],
    ['Submit the registration form', 'submit'],
    ['Compare the available plans', 'compare'],
    ['Extract all rows as CSV', 'extract'],
    ['What does this page say?', 'read'],
  ] as const)('classifies %s as %s', (request, expected) => {
    expect(classifyContextIntent('chat', request)).toBe(expected);
  });

  it('keeps fixed reading capabilities in read mode', () => {
    expect(classifyContextIntent('summarize', 'Submit the form')).toBe('read');
  });

  it('identifies action-bearing intents', () => {
    expect(isInteractionIntent('navigate')).toBe(true);
    expect(isInteractionIntent('edit')).toBe(true);
    expect(isInteractionIntent('submit')).toBe(true);
    expect(isInteractionIntent('locate')).toBe(false);
  });
});
