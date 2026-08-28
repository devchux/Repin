import { defineTelemetryEvent } from "./event";

export const AgentTelemetryEvents = {
  run: defineTelemetryEvent({
    name: "repin.agent.run",
    metricName: "agent.run",
  }),
  toolExecution: defineTelemetryEvent({
    name: "repin.tool.execute",
    metricName: "tool.execution",
  }),
} as const;
