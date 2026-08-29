import { defineTelemetryEvent } from "./event";

export const QueueTelemetryEvents = {
  assistantJob: defineTelemetryEvent({
    name: "repin.queue.assistant.process",
    metricName: "queue.assistant.process",
  }),
} as const;
