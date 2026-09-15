import type {
  BrowserToolExecutionContext,
  BrowserToolName,
  BrowserToolResult,
} from './browser-tool.types';

export const APPLICATION_TOOL_NAMES = ['save_page'] as const;
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

export type ApplicationToolResult = {
  readonly savedPageId: string;
  readonly created: boolean;
  readonly url: string;
  readonly title: string;
};

export type ToolResult = BrowserToolResult | ApplicationToolResult;
