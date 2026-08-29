# Repin Observability

`@repo/observability` is the provider-neutral telemetry contract shared by the
server, web application, and browser extension.

It owns:

- canonical event and metric names
- canonical attribute names
- tracing and bounded operation metrics
- domain-level event catalogues

Runtime SDK setup does not belong here. Node exporters and auto-instrumentation
remain in `apps/server/src/infrastructure/telemetry`; browser clients may install
their own OpenTelemetry provider without importing Node dependencies.

Add events to the relevant file under `src/events` and export the domain from
`src/events/index.ts`. IDs and other high-cardinality values may be span
attributes, but must not become metric dimensions. Never add prompts, page
content, tool arguments, model responses, credentials, or other sensitive user
data to telemetry attributes.
