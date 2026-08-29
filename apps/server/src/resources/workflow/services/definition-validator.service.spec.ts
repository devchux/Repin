import { BadRequestException } from '@nestjs/common';
import { DefinitionValidator } from './definition-validator.service';

describe('DefinitionValidator', () => {
  const validator = new DefinitionValidator();

  it('accepts an agent workflow with a terminal node', () => {
    expect(() =>
      validator.validate({
        startNodeId: 'research',
        nodes: [
          {
            id: 'research',
            type: 'agent',
            capability: 'chat',
            context: {
              url: 'https://example.com',
              title: 'Research',
              pageContent: 'Research this topic',
            },
          },
          { id: 'done', type: 'end' },
        ],
        edges: [{ from: 'research', to: 'done' }],
      }),
    ).not.toThrow();
  });

  it('rejects cycles so runtime work is bounded', () => {
    expect(() =>
      validator.validate({
        startNodeId: 'first',
        nodes: [
          {
            id: 'first',
            type: 'agent',
            capability: 'chat',
            context: {
              url: 'https://example.com',
              title: 'First',
              pageContent: 'First',
            },
          },
          {
            id: 'second',
            type: 'agent',
            capability: 'chat',
            context: {
              url: 'https://example.com',
              title: 'Second',
              pageContent: 'Second',
            },
          },
        ],
        edges: [
          { from: 'first', to: 'second' },
          { from: 'second', to: 'first' },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('requires condition nodes to define both outcomes', () => {
    expect(() =>
      validator.validate({
        startNodeId: 'check',
        nodes: [
          {
            id: 'check',
            type: 'condition',
            inputKey: 'input.ready',
            operator: 'exists',
          },
          { id: 'done', type: 'end' },
        ],
        edges: [{ from: 'check', to: 'done', outcome: 'true' }],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects goals without observable success criteria', () => {
    expect(() =>
      validator.validateGoal({
        objective: 'Finish the task',
        successCriteria: [],
      }),
    ).toThrow(BadRequestException);
  });

  it('requires every newly created workflow to declare a goal', () => {
    expect(() => validator.validateGoal(undefined as never)).toThrow(
      BadRequestException,
    );
  });

  it('rejects deterministic comparisons without an expected value', () => {
    expect(() =>
      validator.validateGoal({
        objective: 'Confirm the result',
        successCriteria: [
          {
            id: 'result-matches',
            description: 'The result matches the expected value',
            verification: {
              type: 'deterministic',
              source: 'output',
              path: 'result',
              operator: 'equals',
            },
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });
});
