export const EVENT_STREAM_PORT = "repin.event-stream";

export type EventStreamKind = "assistant-run" | "workflow-instance";

export type EventStreamClientMessage =
  | {
      readonly type: "subscribe";
      readonly kind: EventStreamKind;
      readonly resourceId: string;
      readonly cursor?: string;
    }
  | { readonly type: "unsubscribe" };

export type EventStreamServerMessage =
  | { readonly type: "connected"; readonly cursor?: string }
  | {
      readonly type: "event";
      readonly event: {
        readonly id?: string;
        readonly type: string;
        readonly data: unknown;
      };
    }
  | { readonly type: "reconnecting"; readonly attempt: number }
  | { readonly type: "error"; readonly message: string };
