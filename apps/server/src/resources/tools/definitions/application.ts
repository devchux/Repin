import type { AiTool } from '../../ai/types/provider';
import type { ApplicationToolName } from '../types/application-tool.types';

type ApplicationToolDefinition = AiTool & {
  readonly name: ApplicationToolName;
};

const optionalString = { type: 'string' } as const;
const optionalUrl = { type: 'string', format: 'uri' } as const;

export const APPLICATION_TOOL_DEFINITIONS = [
  {
    name: 'save_page',
    description:
      'Save a web page to the authenticated user’s Repin library only when the user explicitly asks to save it. Use the canonical URL when available. Repeated saves are idempotent.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          format: 'uri',
          description: 'Absolute HTTP or HTTPS page URL.',
        },
        canonicalUrl: optionalUrl,
        title: { type: 'string', minLength: 1, maxLength: 500 },
        description: optionalString,
        siteName: optionalString,
        author: optionalString,
        publishedAt: { type: 'string', format: 'date-time' },
        imageUrl: optionalUrl,
        faviconUrl: optionalUrl,
        excerpt: optionalString,
        content: {
          type: 'string',
          description: 'Readable page text, when already available.',
        },
        selectedText: optionalString,
        note: optionalString,
        tags: {
          type: 'array',
          items: { type: 'string', minLength: 1, maxLength: 50 },
          maxItems: 25,
        },
        capturedAt: { type: 'string', format: 'date-time' },
      },
      required: ['url', 'title'],
      additionalProperties: false,
    },
  },
] as const satisfies readonly ApplicationToolDefinition[];
