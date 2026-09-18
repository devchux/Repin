import { BadRequestException } from '@nestjs/common';
import { RunService } from './run.service';
import type { ExecuteDto } from '../dto/execute.dto';

describe('RunService context validation', () => {
  const service = Object.create(RunService.prototype) as RunService;

  const request = (url = 'https://example.com'): ExecuteDto => ({
    capability: 'summarize',
    context: {
      url: 'https://example.com',
      title: 'Example',
      observation: {
        schemaVersion: 1,
        observationId: 'observation-1',
        tabId: '',
        documentRevision: 'revision-1',
        capturedAt: '2026-09-18T00:00:00.000Z',
        url,
        title: 'Example',
        blocks: [
          {
            id: 'b1',
            kind: 'paragraph',
            text: 'Page content',
            visible: true,
            inViewport: true,
          },
        ],
        truncated: false,
      },
    },
  });

  it('accepts semantic observation blocks as page content', () => {
    expect(() => service.validateRequest(request())).not.toThrow();
  });

  it('rejects an observation from a different URL', () => {
    expect(() =>
      service.validateRequest(request('https://attacker.example')),
    ).toThrow(BadRequestException);
  });

  it('rejects aggregate observation text above the limit', () => {
    const oversized = request();
    oversized.context.observation = {
      ...oversized.context.observation!,
      blocks: Array.from({ length: 11 }, (_, index) => ({
        id: `b${index + 1}`,
        kind: 'paragraph' as const,
        text: 'a'.repeat(10_000),
        visible: true,
        inViewport: true,
      })),
    };

    expect(() => service.validateRequest(oversized)).toThrow(
      BadRequestException,
    );
  });
});
