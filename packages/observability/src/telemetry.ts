import {
  metrics,
  SpanStatusCode,
  trace,
  type Attributes,
} from "@opentelemetry/api";
import { TelemetryAttributes } from "./attributes";
import type { TelemetryEvent } from "./events";

const tracer = trace.getTracer("repin");
const meter = metrics.getMeter("repin");
const operationDuration = meter.createHistogram("repin.operation.duration", {
  description: "Duration of Repin application operations",
  unit: "ms",
});
const operationCount = meter.createCounter("repin.operation.count", {
  description: "Count of Repin application operations by outcome",
});

export async function traceOperation<T>(
  event: TelemetryEvent,
  attributes: Attributes,
  operation: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  const metricAttributes = {
    [TelemetryAttributes.operation.name]: event.metricName,
  };

  return tracer.startActiveSpan(event.name, { attributes }, async (span) => {
    try {
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      operationCount.add(1, {
        ...metricAttributes,
        [TelemetryAttributes.operation.outcome]: "success",
      });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      if (error instanceof Error) span.recordException(error);
      operationCount.add(1, {
        ...metricAttributes,
        [TelemetryAttributes.operation.outcome]: "error",
      });
      throw error;
    } finally {
      operationDuration.record(performance.now() - startedAt, metricAttributes);
      span.end();
    }
  });
}
