import { BadRequestException } from '@nestjs/common';
import type { HighlightService } from '../../highlight/highlight.service';
import { HIGHLIGHT_COLORS } from '../../highlight/entities/highlight.entity';
import {
  readHttpUrl,
  readOptionalString,
  readRequiredString,
} from '../../../shared/utils/validation';
import type {
  HighlightSelectionToolResult,
  ToolExecutionContext,
} from '../types/application-tool.types';

const boundedOptionalText = (
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

export async function executeHighlightSelectionTool(
  input: Record<string, unknown>,
  context: ToolExecutionContext,
  highlights: HighlightService,
): Promise<HighlightSelectionToolResult> {
  const pageTitle = readRequiredString(input, 'pageTitle');
  const quote = readRequiredString(input, 'quote');
  if (pageTitle.length > 500 || quote.length > 50_000) {
    throw new BadRequestException(
      'Highlight title or quote exceeds its length limit',
    );
  }
  const inputColor = readOptionalString(input, 'color');
  const color = inputColor
    ? HIGHLIGHT_COLORS.find((candidate) => candidate === inputColor)
    : undefined;
  if (inputColor && !color) {
    throw new BadRequestException('Unsupported highlight color');
  }
  const capturedAt = readOptionalString(input, 'capturedAt');
  if (capturedAt && Number.isNaN(Date.parse(capturedAt))) {
    throw new BadRequestException('capturedAt must be a valid date');
  }

  const result = await highlights.create(context.userId, {
    clientId: context.idempotencyKey,
    url: readHttpUrl(input, 'url'),
    pageTitle,
    quote,
    prefix: boundedOptionalText(input, 'prefix', 300),
    suffix: boundedOptionalText(input, 'suffix', 300),
    note: boundedOptionalText(input, 'note', 10_000),
    color,
    capturedAt,
  });

  return {
    highlightId: result.data.id,
    created: result.created,
    url: result.data.url,
  };
}
