export type TelemetryEvent = Readonly<{
  name: string;
  metricName: string;
}>;

export function defineTelemetryEvent<T extends TelemetryEvent>(event: T): T {
  return event;
}
