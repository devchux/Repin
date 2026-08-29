export const BROWSER_SESSION_PROTOCOL_VERSION = 1 as const;

export interface BrowserCommandEnvelope {
  readonly protocolVersion: typeof BROWSER_SESSION_PROTOCOL_VERSION;
  readonly type: 'browser.command';
  readonly payload: {
    readonly commandId: string;
    readonly runId: string;
    readonly name: string;
    readonly input: Readonly<Record<string, unknown>>;
    readonly cacheResult?: boolean;
  };
}

export interface BrowserCommandCancelEnvelope {
  readonly protocolVersion: typeof BROWSER_SESSION_PROTOCOL_VERSION;
  readonly type: 'browser.command.cancel';
  readonly payload: { readonly commandId: string };
}

export type BrowserSessionServerMessage =
  | BrowserCommandEnvelope
  | BrowserCommandCancelEnvelope;

export type BrowserSessionClientMessage =
  | {
      readonly protocolVersion: typeof BROWSER_SESSION_PROTOCOL_VERSION;
      readonly type: 'browser.session.ready';
      readonly payload: { readonly browserSessionId: string };
    }
  | {
      readonly protocolVersion: typeof BROWSER_SESSION_PROTOCOL_VERSION;
      readonly type: 'browser.command.result';
      readonly payload: {
        readonly commandId: string;
        readonly result: unknown;
      };
    }
  | {
      readonly protocolVersion: typeof BROWSER_SESSION_PROTOCOL_VERSION;
      readonly type: 'browser.command.error';
      readonly payload: {
        readonly commandId: string;
        readonly code: string;
        readonly message: string;
      };
    }
  | {
      readonly protocolVersion: typeof BROWSER_SESSION_PROTOCOL_VERSION;
      readonly type: 'browser.session.heartbeat';
      readonly payload: { readonly sentAt: string };
    };
