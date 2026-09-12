import {
  authenticatedFetch,
  getExtensionServerUrl,
} from "../auth/extension-auth-client";
import {
  EVENT_STREAM_PORT,
  type EventStreamClientMessage,
  type EventStreamKind,
  type EventStreamServerMessage,
} from "./event-stream-protocol";
import { parseServerEvents, type ParsedServerEvent } from "./sse-parser";

const TERMINAL_RUN_STATUSES = new Set(["cancelled", "completed", "failed"]);
const TERMINAL_WORKFLOW_EVENTS = new Set([
  "workflow.cancelled",
  "workflow.completed",
  "workflow.failed",
]);

const endpointFor = (serverUrl: string, kind: EventStreamKind, id: string) =>
  kind === "assistant-run"
    ? `${serverUrl}/api/assistant/runs/${id}/events`
    : `${serverUrl}/api/workflows/instances/${id}/events`;

const isTerminal = (kind: EventStreamKind, event: ParsedServerEvent) => {
  if (kind === "workflow-instance")
    return TERMINAL_WORKFLOW_EVENTS.has(event.type);
  const status =
    event.data && typeof event.data === "object" && "status" in event.data
      ? String(event.data.status)
      : event.type;
  return TERMINAL_RUN_STATUSES.has(status);
};

const delay = (milliseconds: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });

const post = (
  port: Browser.runtime.Port,
  message: EventStreamServerMessage,
) => {
  try {
    port.postMessage(message);
  } catch {
    // The subscriber disconnected between the stream read and delivery.
  }
};

const runSubscription = async (
  port: Browser.runtime.Port,
  request: Extract<EventStreamClientMessage, { type: "subscribe" }>,
  signal: AbortSignal,
) => {
  let cursor = request.cursor;
  let attempt = 0;
  while (!signal.aborted) {
    try {
      const serverUrl = await getExtensionServerUrl();
      const headers = new Headers({ Accept: "text/event-stream" });
      if (cursor) headers.set("Last-Event-ID", cursor);
      const response = await authenticatedFetch(
        endpointFor(serverUrl, request.kind, request.resourceId),
        { headers, signal },
      );
      if (!response.ok || !response.body) {
        throw new Error(`Event stream failed with status ${response.status}`);
      }
      attempt = 0;
      post(port, { type: "connected", cursor });
      for await (const event of parseServerEvents(response.body)) {
        if (signal.aborted) return;
        if (event.id && event.id === cursor) continue;
        if (event.id) cursor = event.id;
        post(port, { type: "event", event });
        if (isTerminal(request.kind, event)) return;
      }
      if (signal.aborted) return;
      throw new Error("Event stream closed before completion");
    } catch (error) {
      if (signal.aborted) return;
      attempt += 1;
      if (attempt >= 8) {
        post(port, {
          type: "error",
          message:
            error instanceof Error ? error.message : "Event stream unavailable",
        });
        return;
      }
      post(port, { type: "reconnecting", attempt });
      const backoff = Math.min(15_000, 500 * 2 ** (attempt - 1));
      await delay(backoff + Math.floor(Math.random() * 250), signal).catch(
        () => undefined,
      );
    }
  }
};

export const registerEventStreamManager = () => {
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== EVENT_STREAM_PORT) return;
    let controller: AbortController | undefined;
    port.onMessage.addListener((message: EventStreamClientMessage) => {
      controller?.abort();
      controller = undefined;
      if (message.type === "subscribe") {
        controller = new AbortController();
        void runSubscription(port, message, controller.signal);
      }
    });
    port.onDisconnect.addListener(() => controller?.abort());
  });
};
