import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import configuration from '../../config/configuration';

const { telemetry } = configuration();

const sdk = telemetry.enabled
  ? new NodeSDK({
      serviceName: telemetry.serviceName,
      traceExporter: new OTLPTraceExporter(),
      metricReaders: [
        new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter(),
          exportIntervalMillis: telemetry.metricExportInterval,
        }),
      ],
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    })
  : undefined;

sdk?.start();

export async function shutdownTelemetry(): Promise<void> {
  await sdk?.shutdown();
}
