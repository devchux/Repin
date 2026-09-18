import { BadRequestException } from '@nestjs/common';
import type { BookmarkService } from '../../bookmark/services/bookmark.service';
import type {
  SearchBookmarksToolResult,
  ToolExecutionContext,
} from '../types/application-tool.types';

export async function executeSearchBookmarksTool(
  input: Record<string, unknown>,
  context: ToolExecutionContext,
  bookmarks: BookmarkService,
): Promise<SearchBookmarksToolResult> {
  const query = input.query;
  if (typeof query !== 'string' || !query.trim() || query.length > 200) {
    throw new BadRequestException('query must be 1 to 200 characters');
  }
  const search = query.trim();
  return {
    query: search,
    matches: await bookmarks.search(context.userId, search),
  };
}
