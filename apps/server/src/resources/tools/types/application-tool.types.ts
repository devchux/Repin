import type {
  BrowserToolExecutionContext,
  BrowserToolName,
  BrowserToolResult,
} from './browser-tool.types';
import type { BookmarkSearchHit } from '../../bookmark/bookmark-search';

export const APPLICATION_TOOL_NAMES = [
  'bookmark_page',
  'search_bookmarks',
] as const;
export type ApplicationToolName = (typeof APPLICATION_TOOL_NAMES)[number];
export type ToolName = BrowserToolName | ApplicationToolName;

export interface ToolCall {
  readonly name: ToolName;
  readonly arguments: Record<string, unknown>;
}

export type ToolExecutionContext = Omit<
  BrowserToolExecutionContext,
  'browserSessionId'
> & {
  readonly browserSessionId?: string;
};

export type BookmarkPageToolResult = {
  readonly bookmarkId: string;
  readonly created: boolean;
  readonly url: string;
  readonly title: string;
};

export type SearchBookmarksToolResult = {
  readonly query: string;
  readonly matches: readonly BookmarkSearchHit[];
};

export type ApplicationToolResult =
  | BookmarkPageToolResult
  | SearchBookmarksToolResult;

export type ToolResult = BrowserToolResult | ApplicationToolResult;
