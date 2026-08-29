import type {
  BrowserToolExecutionContext,
  BrowserToolName,
} from '../types/browser-tool.types';

export const EXTENSION_BROWSER_TRANSPORT = Symbol(
  'EXTENSION_BROWSER_TRANSPORT',
);

export interface ExtensionBrowserCommand {
  readonly commandId: string;
  readonly runId: string;
  readonly name: BrowserToolName;
  readonly input: Readonly<Record<string, unknown>>;
  readonly cacheResult?: boolean;
}

/**
 * Sends a command to the extension connection owned by a user/browser session.
 * Implementations are responsible for correlation, timeouts, and disconnection.
 */
export interface ExtensionBrowserTransport {
  send<TResult>(
    context: BrowserToolExecutionContext,
    command: ExtensionBrowserCommand,
  ): Promise<TResult>;
}
