import { Injectable } from '@nestjs/common';
import type { BrowserToolExecutionContext } from '../types/browser-tool.types';
import type {
  ExtensionBrowserCommand,
  ExtensionBrowserTransport,
} from '../executors/extension-browser-transport';
import { BrowserSessionRegistry } from './browser-session.registry';

@Injectable()
export class WebSocketExtensionBrowserTransport implements ExtensionBrowserTransport {
  constructor(private readonly sessions: BrowserSessionRegistry) {}

  send<TResult>(
    context: BrowserToolExecutionContext,
    command: ExtensionBrowserCommand,
  ): Promise<TResult> {
    return this.sessions.execute<TResult>(context, command);
  }
}
