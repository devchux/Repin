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
});
