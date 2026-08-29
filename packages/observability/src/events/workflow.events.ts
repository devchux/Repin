import { defineTelemetryEvent } from "./event";

export const WorkflowTelemetryEvents = {
  process: defineTelemetryEvent({
    name: "repin.workflow.process",
    metricName: "workflow.process",
  }),
} as const;
