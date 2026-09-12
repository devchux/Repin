import { useEffect, useRef, useState } from "react";

import {
  EVENT_STREAM_PORT,
  type EventStreamKind,
  type EventStreamServerMessage,
} from "../assistant/event-stream-protocol";

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
    setStatus("connecting");
    const port = browser.runtime.connect({ name: EVENT_STREAM_PORT });
    const receive = (message: EventStreamServerMessage) => {
      if (message.type === "connected") setStatus("connected");
      if (message.type === "reconnecting") setStatus("connecting");
      if (message.type === "error") setStatus("fallback");
      if (message.type === "event") handler.current(message.event);
    };
    port.onMessage.addListener(receive);
    port.postMessage({ type: "subscribe", kind, resourceId });
    return () => {
      port.postMessage({ type: "unsubscribe" });
      port.disconnect();
    };
  }, [kind, resourceId]);

  return status;
};
