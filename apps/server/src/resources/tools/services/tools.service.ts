import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AiTool } from '../../ai/types/provider';
import { BookmarkService } from '../../bookmark/services/bookmark.service';
import { HighlightService } from '../../highlight/highlight.service';
import { executeBookmarkPageTool } from '../application/bookmark-page-tool.handler';
import { executeHighlightSelectionTool } from '../application/highlight-selection-tool.handler';
import { executeSearchBookmarksTool } from '../application/search-bookmarks-tool.handler';
import { dispatchBrowserTool } from '../browser/browser-tool.dispatcher';
import { TOOL_DEFINITIONS } from '../definitions';
import { BrowserActionPolicyService } from '../policy/browser-action-policy.service';
import { getBrowserToolDescriptor } from '../policy/browser-tool-descriptors';
import { BrowserToolApprovalService } from '../policy/browser-tool-approval.service';
import {
  APPLICATION_TOOL_NAMES,
  ToolCall,
  ToolExecutionContext,
  ToolName,
  ToolResult,
} from '../types/application-tool.types';
import {
  BROWSER_TOOL_EXECUTOR,
  BROWSER_TOOL_NAMES,
} from '../types/browser-tool.types';
import type {
  BrowserToolCall,
  BrowserToolExecutionContext,
  BrowserToolExecutor,
  BrowserToolName,
} from '../types/browser-tool.types';

const BROWSER_TOOL_NAME_SET: ReadonlySet<string> = new Set(BROWSER_TOOL_NAMES);
const APPLICATION_TOOL_NAME_SET: ReadonlySet<string> = new Set(
  APPLICATION_TOOL_NAMES,
);

@Injectable()
export class ToolsService {
  constructor(
    @Optional()
    @Inject(BROWSER_TOOL_EXECUTOR)
    private readonly browserExecutor?: BrowserToolExecutor,
    private readonly approvals?: BrowserToolApprovalService,
    private readonly actionPolicy?: BrowserActionPolicyService,
    @Optional()
    private readonly bookmarks?: BookmarkService,
    @Optional()
    private readonly highlights?: HighlightService,
  ) {}

  getDefinitions(): readonly AiTool[] {
    return TOOL_DEFINITIONS;
  }

  supports(name: string): name is ToolName {
    return (
      BROWSER_TOOL_NAME_SET.has(name) || APPLICATION_TOOL_NAME_SET.has(name)
    );
  }

  supportsBrowser(name: string): name is BrowserToolName {
    return BROWSER_TOOL_NAME_SET.has(name);
  }

  requiresBrowserSession(name: ToolName): name is BrowserToolName {
    return this.supportsBrowser(name);
  }

  async execute(
    inputCall: ToolCall,
    inputContext: ToolExecutionContext,
  ): Promise<ToolResult> {
    this.assertBaseContext(inputContext);

    if (!this.supportsBrowser(inputCall.name)) {
      return this.executeApplicationTool(inputCall, inputContext);
    }

    const call: BrowserToolCall = {
      name: inputCall.name,
      arguments: inputCall.arguments,
    };
    const context = this.assertBrowserContext(inputContext);
    const executor = this.getBrowserExecutor();
    const descriptor = getBrowserToolDescriptor(call.name);

    if (
      descriptor.requiresDocumentRevision &&
      typeof call.arguments.documentRevision !== 'string'
    ) {
      throw new BadRequestException(
        `${call.name} requires a documentRevision from a current observation`,
      );
    }

    const policy = this.actionPolicy
      ? await this.actionPolicy.evaluate(call, context, executor)
      : undefined;
    await this.approvals?.authorize(
      context.userId,
      context.runId,
      call.name,
      call.arguments,
      policy,
    );

    return dispatchBrowserTool(call, context, executor);
  }

  private executeApplicationTool(
    call: ToolCall,
    context: ToolExecutionContext,
  ): Promise<ToolResult> {
    switch (call.name) {
      case 'bookmark_page':
        if (!this.bookmarks) {
          throw new ServiceUnavailableException(
            'The save page capability is not configured',
          );
        }
        return executeBookmarkPageTool(call.arguments, context, this.bookmarks);
      case 'search_bookmarks':
        if (!this.bookmarks) {
          throw new ServiceUnavailableException(
            'Bookmark search is not configured',
          );
        }
        return executeSearchBookmarksTool(
          call.arguments,
          context,
          this.bookmarks,
        );
      case 'highlight_selection':
        if (!this.highlights) {
          throw new ServiceUnavailableException(
            'Highlight capability is not configured',
          );
        }
        return executeHighlightSelectionTool(
          call.arguments,
          context,
          this.highlights,
        );
      default:
        throw new BadRequestException(`Unsupported tool: ${call.name}`);
    }
  }

  private getBrowserExecutor(): BrowserToolExecutor {
    if (!this.browserExecutor) {
      throw new ServiceUnavailableException(
        'No browser session executor is configured',
      );
    }
    return this.browserExecutor;
  }

  private assertBaseContext(context: ToolExecutionContext): void {
    if (!Number.isInteger(context.userId) || context.userId <= 0) {
      throw new BadRequestException('A valid tool user ID is required');
    }
    if (!context.runId?.trim()) {
      throw new BadRequestException('A tool run ID is required');
    }
    if (context.signal?.aborted) {
      throw context.signal.reason instanceof Error
        ? context.signal.reason
        : new Error('Tool execution was aborted');
    }
  }

  private assertBrowserContext(
    context: ToolExecutionContext,
  ): BrowserToolExecutionContext {
    if (!context.browserSessionId?.trim()) {
      throw new BadRequestException('A browser session ID is required');
    }
    return { ...context, browserSessionId: context.browserSessionId.trim() };
  }
}
