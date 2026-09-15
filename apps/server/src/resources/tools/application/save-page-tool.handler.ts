import { BadRequestException } from '@nestjs/common';
import type { SavedPageService } from '../../saved-page/saved-page.service';
import {
  parseHttpUrl,
  readHttpUrl,
  readOptionalString,
  readOptionalStringArray,
  readRequiredString,
} from '../../../shared/utils/validation';
import type {
  ApplicationToolResult,
  ToolExecutionContext,
} from '../types/application-tool.types';

const readOptionalHttpUrl = (
  input: Record<string, unknown>,
  field: string,
): string | undefined => {
  const value = readOptionalString(input, field);
  return value ? parseHttpUrl(value, field) : undefined;
};

const readOptionalBoundedText = (
  input: Record<string, unknown>,
  field: string,
  maximum: number,
): string | undefined => {
  const value = readOptionalString(input, field);
  if (value && value.length > maximum) {
    throw new BadRequestException(
      `${field} must not exceed ${maximum} characters`,
    );
  }
  return value;
};

const readOptionalDate = (
  input: Record<string, unknown>,
  field: string,
): string | undefined => {
  const value = readOptionalString(input, field);
  if (value && Number.isNaN(Date.parse(value))) {
    throw new BadRequestException(`${field} must be a valid date`);
  }
  return value;
};

export const executeSavePageTool = async (
  input: Record<string, unknown>,
  context: ToolExecutionContext,
  savedPages: SavedPageService,
): Promise<ApplicationToolResult> => {
  const tags = readOptionalStringArray(input, 'tags', 25);
  if (tags?.some((tag) => tag.length > 50)) {
    throw new BadRequestException('tags must not exceed 50 characters each');
  }

  const title = readRequiredString(input, 'title');
  if (title.length > 500) {
    throw new BadRequestException('title must not exceed 500 characters');
  }

  const result = await savedPages.create(context.userId, {
    url: readHttpUrl(input, 'url'),
    canonicalUrl: readOptionalHttpUrl(input, 'canonicalUrl'),
    title,
    description: readOptionalBoundedText(input, 'description', 2_000),
    siteName: readOptionalBoundedText(input, 'siteName', 255),
    author: readOptionalBoundedText(input, 'author', 255),
    publishedAt: readOptionalDate(input, 'publishedAt'),
    imageUrl: readOptionalHttpUrl(input, 'imageUrl'),
    faviconUrl: readOptionalHttpUrl(input, 'faviconUrl'),
    excerpt: readOptionalBoundedText(input, 'excerpt', 10_000),
    content: readOptionalBoundedText(input, 'content', 1_000_000),
    selectedText: readOptionalBoundedText(input, 'selectedText', 50_000),
    note: readOptionalBoundedText(input, 'note', 10_000),
    tags: tags ? [...tags] : undefined,
    capturedAt: readOptionalDate(input, 'capturedAt'),
  });

  return {
    savedPageId: result.data.id,
    created: result.created,
    url: result.data.url,
    title: result.data.title,
  };
};
