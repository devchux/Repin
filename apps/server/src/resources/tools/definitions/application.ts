import type { AiTool } from '../../ai/types/provider';
import type { ApplicationToolName } from '../types/application-tool.types';

type ApplicationToolDefinition = AiTool & {
  readonly name: ApplicationToolName;
};

const optionalString = { type: 'string' } as const;
const optionalUrl = { type: 'string', format: 'uri' } as const;

export const APPLICATION_TOOL_DEFINITIONS = [
  {
    name: 'bookmark_page',
    description:
      "Save a web page to the authenticated user's Repin library only when the user explicitly asks to save it. Use the canonical URL when available. Repeated saves are idempotent.",
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
        saveReason: {
          type: 'string',
          maxLength: 2000,
          description: "The user's reason for saving this page, when stated.",
        },
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
  {
    name: 'search_bookmarks',
    description:
      'Search the authenticated user’s saved bookmarks, including captured page content. Use concise topic keywords when the user asks about saved material. Returns short passages and source URLs; cite those URLs in the answer and do not claim facts absent from the passages.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 200 },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
] as const satisfies readonly ApplicationToolDefinition[];
