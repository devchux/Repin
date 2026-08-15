import { Injectable } from '@nestjs/common';
import { ExtensionBrowserExecutor } from './extension-browser.executor';
import { PlaywrightBrowserExecutor } from './playwright-browser.executor';
import type {
  BrowserInteractionCommand,
  BrowserNavigationCommand,
  BrowserToolExecutionContext,
  BrowserToolExecutor,
  TabTargetInput,
} from '../types/browser-tool.types';

@Injectable()
export class BrowserExecutorRouter implements BrowserToolExecutor {
  constructor(
    private readonly extension: ExtensionBrowserExecutor,
    private readonly playwright: PlaywrightBrowserExecutor,
  ) {}

  private executor(context: BrowserToolExecutionContext): BrowserToolExecutor {
    return context.executorKind === 'managed'
      ? this.playwright
      : this.extension;
  }

  navigate(
    context: BrowserToolExecutionContext,
    input: { url: string; tabId?: string },
  ) {
    return this.executor(context).navigate(context, input);
  }
  goBack(context: BrowserToolExecutionContext, input: TabTargetInput) {
    return this.executor(context).goBack(context, input);
  }
  goForward(context: BrowserToolExecutionContext, input: TabTargetInput) {
    return this.executor(context).goForward(context, input);
  }
  reloadPage(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { bypassCache?: boolean },
  ) {
    return this.executor(context).reloadPage(context, input);
  }
  getSnapshot(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { includeText?: boolean; maxElements?: number },
  ) {
    return this.executor(context).getSnapshot(context, input);
  }
  getScreenshot(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & {
      fullPage?: boolean;
      format?: 'png' | 'jpeg';
      quality?: number;
    },
  ) {
    return this.executor(context).getScreenshot(context, input);
  }
  getPageMetadata(context: BrowserToolExecutionContext, input: TabTargetInput) {
    return this.executor(context).getPageMetadata(context, input);
  }
  getElement(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { ref: string; documentRevision: string },
  ) {
    return this.executor(context).getElement(context, input);
  }
  getSelectedText(context: BrowserToolExecutionContext, input: TabTargetInput) {
    return this.executor(context).getSelectedText(context, input);
  }
  getForms(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { maxForms?: number },
  ) {
    return this.executor(context).getForms(context, input);
  }
  getNavigationState(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ) {
    return this.executor(context).getNavigationState(context, input);
  }
  getFrames(context: BrowserToolExecutionContext, input: TabTargetInput) {
    return this.executor(context).getFrames(context, input);
  }
  getConsoleMessages(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { limit?: number },
  ) {
    return this.executor(context).getConsoleMessages(context, input);
  }
  getNetworkActivity(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { limit?: number },
  ) {
    return this.executor(context).getNetworkActivity(context, input);
  }
  getDownloads(
    context: BrowserToolExecutionContext,
    input: { limit?: number },
  ) {
    return this.executor(context).getDownloads(context, input);
  }
  getDialog(context: BrowserToolExecutionContext, input: TabTargetInput) {
    return this.executor(context).getDialog(context, input);
  }
  getStorageSummary(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ) {
    return this.executor(context).getStorageSummary(context, input);
  }
  listTabs(context: BrowserToolExecutionContext) {
    return this.executor(context).listTabs(context);
  }
  openTab(
    context: BrowserToolExecutionContext,
    input: { url?: string; active?: boolean },
  ) {
    return this.executor(context).openTab(context, input);
  }
  activateTab(context: BrowserToolExecutionContext, input: { tabId: string }) {
    return this.executor(context).activateTab(context, input);
  }
  closeTab(context: BrowserToolExecutionContext, input: { tabId: string }) {
    return this.executor(context).closeTab(context, input);
  }
  navigateBrowser(
    context: BrowserToolExecutionContext,
    command: BrowserNavigationCommand,
  ) {
    return this.executor(context).navigateBrowser(context, command);
  }
  interact(
    context: BrowserToolExecutionContext,
    command: BrowserInteractionCommand,
  ) {
    return this.executor(context).interact(context, command);
  }
}
