import {
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  EXTENSION_BROWSER_TRANSPORT,
  type ExtensionBrowserTransport,
} from './extension-browser-transport';
import type {
  BrowserConsoleObservation,
  BrowserDialogObservation,
  BrowserDownloadsObservation,
  BrowserElementDetails,
  BrowserFormsObservation,
  BrowserFramesObservation,
  BrowserInteractionCommand,
  BrowserInteractionResult,
  BrowserNavigationCommand,
  BrowserNavigationResult,
  BrowserNavigationState,
  BrowserNetworkObservation,
  BrowserPageMetadata,
  BrowserPageSnapshot,
  BrowserPageState,
  BrowserScreenshot,
  BrowserSelection,
  BrowserStorageSummary,
  BrowserTab,
  BrowserToolExecutionContext,
  BrowserToolExecutor,
  BrowserToolName,
  TabTargetInput,
} from '../types/browser-tool.types';
import { BrowserToolApprovalService } from '../policy/browser-tool-approval.service';

@Injectable()
export class ExtensionBrowserExecutor implements BrowserToolExecutor {
  constructor(
    @Optional()
    @Inject(EXTENSION_BROWSER_TRANSPORT)
    private readonly transport?: ExtensionBrowserTransport,
    private readonly approvals?: BrowserToolApprovalService,
  ) {}

  navigate(
    context: BrowserToolExecutionContext,
    input: { url: string; tabId?: string },
  ) {
    return this.execute<BrowserPageState>(context, 'browser_navigate', input);
  }

  goBack(context: BrowserToolExecutionContext, input: TabTargetInput) {
    return this.execute<BrowserPageState>(context, 'browser_go_back', input);
  }

  goForward(context: BrowserToolExecutionContext, input: TabTargetInput) {
    return this.execute<BrowserPageState>(context, 'browser_go_forward', input);
  }

  reloadPage(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { bypassCache?: boolean },
  ) {
    return this.execute<BrowserPageState>(
      context,
      'browser_reload_page',
      input,
    );
  }

  getSnapshot(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { includeText?: boolean; maxElements?: number },
  ) {
    return this.execute<BrowserPageSnapshot>(
      context,
      'browser_get_snapshot',
      input,
    );
  }

  getScreenshot(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & {
      fullPage?: boolean;
      format?: 'png' | 'jpeg';
      quality?: number;
    },
  ) {
    return this.execute<BrowserScreenshot>(
      context,
      'browser_get_screenshot',
      input,
    );
  }

  getPageMetadata(context: BrowserToolExecutionContext, input: TabTargetInput) {
    return this.execute<BrowserPageMetadata>(
      context,
      'browser_get_page_metadata',
      input,
    );
  }

  getElement(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { ref: string; documentRevision: string },
  ) {
    return this.execute<BrowserElementDetails>(
      context,
      'browser_get_element',
      input,
    );
  }

  getSelectedText(context: BrowserToolExecutionContext, input: TabTargetInput) {
    return this.execute<BrowserSelection>(
      context,
      'browser_get_selected_text',
      input,
    );
  }

  getForms(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { maxForms?: number },
  ) {
    return this.execute<BrowserFormsObservation>(
      context,
      'browser_get_forms',
      input,
    );
  }

  getNavigationState(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ) {
    return this.execute<BrowserNavigationState>(
      context,
      'browser_get_navigation_state',
      input,
    );
  }

  getFrames(context: BrowserToolExecutionContext, input: TabTargetInput) {
    return this.execute<BrowserFramesObservation>(
      context,
      'browser_get_frames',
      input,
    );
  }

  getConsoleMessages(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { limit?: number },
  ) {
    return this.execute<BrowserConsoleObservation>(
      context,
      'browser_get_console_messages',
      input,
    );
  }

  getNetworkActivity(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { limit?: number },
  ) {
    return this.execute<BrowserNetworkObservation>(
      context,
      'browser_get_network_activity',
      input,
    );
  }

  getDownloads(
    context: BrowserToolExecutionContext,
    input: { limit?: number },
  ) {
    return this.execute<BrowserDownloadsObservation>(
      context,
      'browser_get_downloads',
      input,
    );
  }

  getDialog(context: BrowserToolExecutionContext, input: TabTargetInput) {
    return this.execute<BrowserDialogObservation>(
      context,
      'browser_get_dialog',
      input,
    );
  }

  getStorageSummary(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ) {
    return this.execute<BrowserStorageSummary>(
      context,
      'browser_get_storage_summary',
      input,
    );
  }

  listTabs(context: BrowserToolExecutionContext) {
    return this.execute<readonly BrowserTab[]>(
      context,
      'browser_list_tabs',
      {},
    );
  }

  openTab(
    context: BrowserToolExecutionContext,
    input: { url?: string; active?: boolean },
  ) {
    return this.execute<BrowserTab>(context, 'browser_open_tab', input);
  }

  activateTab(context: BrowserToolExecutionContext, input: { tabId: string }) {
    return this.execute<BrowserTab>(context, 'browser_activate_tab', input);
  }

  closeTab(context: BrowserToolExecutionContext, input: { tabId: string }) {
    return this.execute<{ tabId: string; closed: true }>(
      context,
      'browser_close_tab',
      input,
    );
  }

  navigateBrowser(
    context: BrowserToolExecutionContext,
    command: BrowserNavigationCommand,
  ) {
    return this.execute<BrowserNavigationResult>(
      context,
      command.name,
      command.input,
    );
  }

  interact(
    context: BrowserToolExecutionContext,
    command: BrowserInteractionCommand,
  ) {
    return this.execute<BrowserInteractionResult>(
      context,
      command.name,
      command.input,
    );
  }

  private async execute<TResult>(
    context: BrowserToolExecutionContext,
    name: BrowserToolName,
    input: object,
  ): Promise<TResult> {
    if (!this.transport) {
      throw new ServiceUnavailableException(
        'The extension browser transport is not configured',
      );
    }

    this.approvals?.authorize(context.userId, context.runId, name);

    return this.transport.send<TResult>(context, {
      commandId: randomUUID(),
      runId: context.runId,
      name,
      input: input as Readonly<Record<string, unknown>>,
    });
  }
}
