export const TelemetryAttributes = {
  ai: {
    messageCount: "repin.ai.message_count",
    operationName: "gen_ai.operation.name",
    toolCount: "repin.ai.tool_count",
  },
  browser: {
    executionTarget: "repin.browser.execution_target",
  },
  messaging: {
    destinationName: "messaging.destination.name",
    operationName: "messaging.operation.name",
  },
  operation: {
    name: "repin.operation.name",
    outcome: "repin.outcome",
  },
  queue: {
    jobId: "repin.queue.job_id",
  },
  run: {
    capability: "repin.run.capability",
    executionLane: "repin.execution.lane",
    id: "repin.run.id",
  },
  workflow: {
    instanceId: "repin.workflow.instance_id",
  },
} as const;
