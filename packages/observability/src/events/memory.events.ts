import { defineTelemetryEvent } from "./event";

export const MemoryTelemetryEvents = {
  retrieval: defineTelemetryEvent({
    name: "repin.memory.retrieve",
    metricName: "memory.retrieval",
  }),
} as const;
