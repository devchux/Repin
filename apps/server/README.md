# Repin AI server

The NestJS backend for Repin's AI workspace and browser-agent platform. It owns
authentication, durable product data, provider-neutral AI orchestration,
browser tools, approvals, workflows, queues, and execution history.

The server exposes shared capabilities to both the web application and browser
extension. AI providers remain model I/O adapters; browser automation and
agent-loop state belong to the provider-neutral execution harness.

## Assistant queues

Short requests use the `assistant-interactive` BullMQ queue. Long-running
browser work uses the separate `assistant-background` queue so autonomous
navigation cannot delay summaries, explanations, translations, or ordinary
chat responses. Callers can select `executionLane`; otherwise managed-browser
runs and browser-backed chat are routed to `long`, and other requests to
`short`. Approval and suspension resumes retain the run's original lane.

The interactive worker starts with concurrency `5` and can increase local
concurrency to `10` when queue depth or the recent average queue wait crosses a
configured threshold. The background worker has fixed concurrency `2` so long
tasks apply backpressure without consuming interactive capacity. BullMQ's
Redis-backed global rate limit on the interactive lane remains shared across
all application replicas.

Per user, at most two short runs and one long run may be `running`; at most ten
runs may be `queued`. PostgreSQL advisory locks enforce those limits across
multiple API and worker processes.

```env
ASSISTANT_RATE_LIMIT_MAX=25
ASSISTANT_RATE_LIMIT_DURATION=60000
ASSISTANT_SCALE_CHECK_INTERVAL=15000
ASSISTANT_SCALE_DEPTH_THRESHOLD=20
ASSISTANT_SCALE_WAIT_THRESHOLD=5000
ASSISTANT_SHORT_RUN_TIMEOUT=180000
ASSISTANT_LONG_RUN_TIMEOUT=1800000
```

`queueWaitMs` is persisted when a run starts and represents
`startedAt - createdAt`. Infrastructure autoscaling should use queue depth and
this metric when increasing worker replicas; the application scaler only
adjusts concurrency within each running worker process.

## OpenTelemetry

The server supports vendor-neutral traces and metrics through OTLP/HTTP. It is
disabled by default and starts when `OTEL_ENABLED=true` or when
`OTEL_EXPORTER_OTLP_ENDPOINT` is configured.

```env
OTEL_ENABLED=true
OTEL_SERVICE_NAME=repin-server
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_METRIC_EXPORT_INTERVAL=60000
```

Automatic instrumentation covers inbound HTTP requests and supported database,
Redis, and network clients. Repin also emits explicit spans for assistant queue
jobs, agent runs, model generations, and workflow jobs. The custom
`repin.operation.duration` histogram and `repin.operation.count` counter use
bounded operational attributes; prompts, tool arguments, page content, and
model responses are not exported.

Canonical event and attribute definitions live in the shared
`@repo/observability` package. Node SDK lifecycle and exporter configuration
remain server infrastructure so importing the shared package cannot add Node
dependencies to the web application or extension.

Point the OTLP endpoint at an OpenTelemetry Collector to route the same signals
to Grafana Tempo, Prometheus/Mimir, or another compatible backend. Set
`OTEL_SDK_DISABLED=true` to force telemetry off in any environment.

### Run events

Clients can subscribe to a run after creating it:

```http
GET /api/assistant/runs/:id/events
Accept: text/event-stream
```

The authenticated SSE stream emits the current run immediately, emits again
when its persisted status changes, and sends a heartbeat every 15 seconds. A
terminal `completed`, `failed`, or `cancelled` event includes the latest run
data and closes the server stream. Clients must call `EventSource.close()` when
they receive a terminal event; browsers otherwise reconnect automatically.

The regular `GET /api/assistant/runs/:id` endpoint remains the recovery path
after reconnects, browser suspension, or extension restarts.

### Assistant conversations

Creating an assistant run also creates a conversation and returns its
`conversationId`. The initial capability and browsing context are retained so
later questions can refer to the original selection or page.

```http
GET /api/assistant/conversations/:conversationId
POST /api/assistant/conversations/:conversationId/messages

{
  "content": "Can you explain the second point in simpler terms?"
}
```

Each follow-up creates another run on `assistant-interactive`. Subscribe to
that run's existing SSE endpoint for completion. Conversation turns are
processed sequentially, and the model receives the latest 20 persisted
messages together with the original browsing context.

## Installation

```bash
$ pnpm install
```

## PostgreSQL and pgvector

Local Docker development uses the official pgvector PostgreSQL 17 image. The
bookmark intelligence migration enables the extension with:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Start or upgrade the local database, then let the server run its migrations:

```bash
docker compose pull postgres
docker compose up -d postgres redis
docker compose up --build server
```

An existing PostgreSQL 17 data volume can be reused because the image keeps the
same database major version. Do not delete `postgres_data` when changing the
image. Verify installation with:

```bash
docker compose exec postgres psql -U repin -d repin \
  -c "SELECT extversion FROM pg_extension WHERE extname = 'vector';"
```

For a managed database, enable the provider's `vector`/`pgvector` extension or
run `CREATE EXTENSION IF NOT EXISTS vector` as a role with extension privileges
before deploying the server. The application migration then creates the
`vector(1536)` column and HNSW index. If the application role cannot create
extensions, a database administrator must perform only that extension step;
the normal application role can run the remaining migration afterward.

## Running the app

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Test

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Browser extension authentication

The extension uses an OAuth-style Authorization Code flow with PKCE. The
background service opens `/extension/authorize` in the browser, exchanges the
single-use code for a short-lived bearer token, and rotates an opaque refresh
token without asking the user to sign in again.

Set `EXTENSION_CLIENT_IDS` to the comma-separated IDs of the published Chrome
extensions. It may remain empty for unpacked local development, where Chrome
derives the extension ID dynamically. Extension authorization codes expire
after `EXTENSION_AUTHORIZATION_CODE_TTL` (60 seconds by default), while
extension refresh credentials use `EXTENSION_REFRESH_TOKEN_TTL` (30 days by
default).

The extension defaults to `http://localhost:3000` for the web app and
`http://localhost:3001` for the API. Override these in `browser.storage.local`
with `repinWebUrl` and `repinServerUrl` for other environments.
