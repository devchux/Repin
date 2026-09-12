import { useEffect, useRef, useState } from "react";

import {
  EVENT_STREAM_PORT,
  type EventStreamKind,
  type EventStreamServerMessage,
} from "../assistant/event-stream-protocol";
import { runPortOperation } from "../lib/runtime-errors";

export type EventStreamStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "fallback";

export const useEventStream = (
  kind: EventStreamKind,
  resourceId: string | undefined,
  onEvent: (
    event: Extract<EventStreamServerMessage, { type: "event" }>["event"],
  ) => void,
) => {
  const [status, setStatus] = useState<EventStreamStatus>("idle");
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    if (!resourceId) {
      setStatus("idle");
      return;
    }
    let cursor: string | undefined;
    let disposed = false;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let port: Browser.runtime.Port | undefined;

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) return;
      setStatus("fallback");
      const backoff = Math.min(15_000, 500 * 2 ** reconnectAttempt);
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        connect();
      }, backoff);
    };

    const connect = () => {
      if (disposed) return;
      setStatus("connecting");
      try {
        const nextPort = browser.runtime.connect({ name: EVENT_STREAM_PORT });
        port = nextPort;
        const receive = (message: EventStreamServerMessage) => {
          if (message.type === "connected") {
            reconnectAttempt = 0;
            setStatus("connected");
          }
          if (message.type === "reconnecting") setStatus("connecting");
          if (message.type === "error") {
            scheduleReconnect();
            runPortOperation("disconnect a failed stream", () =>
              nextPort.disconnect(),
            );
          }
          if (message.type === "event") {
            if (message.event.id) cursor = message.event.id;
            handler.current(message.event);
          }
        };
        nextPort.onMessage.addListener(receive);
        nextPort.onDisconnect.addListener(scheduleReconnect);
        nextPort.postMessage({
          type: "subscribe",
          kind,
          resourceId,
          cursor,
        });
      } catch {
        scheduleReconnect();
      }
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (!port) return;
      runPortOperation("unsubscribe from a stream", () =>
        port?.postMessage({ type: "unsubscribe" }),
      );
      runPortOperation("disconnect a stream", () => port?.disconnect());
    };
  }, [kind, resourceId]);

  return status;
};
