import { defineTelemetryEvent } from "./event";

export const AiTelemetryEvents = {
  generation: defineTelemetryEvent({
    name: "gen_ai.generate_content",
    metricName: "ai.generation",
  }),
} as const;
