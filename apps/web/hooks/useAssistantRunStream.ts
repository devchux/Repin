"use client";

import type { AssistantRun, AssistantRunTimelineEvent } from "@repo/contracts/assistant";
import { parseServerEvents } from "@repo/client/sse";
import { useEffect, useRef, useState } from "react";

import { createProxyUrl } from "@/lib/api";

const terminalStatuses = new Set(["completed", "failed", "cancelled"]);

type StreamData = AssistantRun & { readonly event?: Readonly<Record<string, unknown>> };

function eventDetail(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (!value || typeof value !== "object" || !("event" in value)) return undefined;
  const detail = value.event;
  return detail && typeof detail === "object"
    ? (detail as Readonly<Record<string, unknown>>)
    : undefined;
}

function isRunData(value: unknown): value is StreamData {
  return Boolean(value && typeof value === "object" && "id" in value && "status" in value);
}

export function useAssistantRunStream(runId?: string) {
  const [run, setRun] = useState<AssistantRun>();
  const [content, setContent] = useState("");
  const [events, setEvents] = useState<AssistantRunTimelineEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const contentRef = useRef("");

  useEffect(() => {
    setRun(undefined);
    setContent("");
    setEvents([]);
    setConnected(false);
    contentRef.current = "";
    if (!runId) return;

    const controller = new AbortController();
    let cursor: string | undefined;
    let reconnectAttempt = 0;

    const connect = async () => {
      while (!controller.signal.aborted) {
        try {
          const headers = new Headers({ Accept: "text/event-stream" });
          if (cursor) headers.set("Last-Event-ID", cursor);
          const response = await fetch(
            createProxyUrl("base", `/assistant/runs/${runId}/events`),
            { headers, signal: controller.signal },
          );
          if (!response.ok || !response.body) {
            throw new Error(`Run stream failed with status ${response.status}`);
          }
          reconnectAttempt = 0;
          setConnected(true);
          for await (const event of parseServerEvents(response.body)) {
            if (controller.signal.aborted) return;
            if (event.id) cursor = event.id;
            const detail = eventDetail(event.data);
            if (isRunData(event.data)) setRun(event.data);
            const cumulativeContent = detail?.content;
            const legacyDelta = detail?.delta;
            if (event.type === "assistant.delta" && typeof cumulativeContent === "string") {
              if (cumulativeContent.length >= contentRef.current.length) {
                contentRef.current = cumulativeContent;
                setContent(cumulativeContent);
              }
            } else if (event.type === "assistant.delta" && typeof legacyDelta === "string") {
              contentRef.current += legacyDelta;
              setContent(contentRef.current);
            }
            if (event.id && event.id !== "0" && detail) {
              const sequence = Number(event.id);
              setEvents((current) => {
                if (current.some((item) => item.sequence === sequence)) return current;
                return [
                  ...current,
                  {
                    id: `${runId}:${event.id}`,
                    sequence,
                    type: event.type,
                    data: detail,
                    createdAt: new Date().toISOString(),
                  },
                ];
              });
            }
            if (isRunData(event.data) && terminalStatuses.has(event.data.status)) return;
          }
          if (controller.signal.aborted) return;
          throw new Error("Run stream closed before completion");
        } catch {
          if (controller.signal.aborted) return;
          setConnected(false);
          reconnectAttempt += 1;
          if (reconnectAttempt >= 8) return;
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(15_000, 500 * 2 ** (reconnectAttempt - 1))),
          );
        }
      }
    };

    void connect();
    return () => controller.abort();
  }, [runId]);

  return { connected, content, events, run };
}
