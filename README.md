# Repin AI

Repin is an AI workspace that understands what users encounter on the web,
remembers what matters, and can eventually act on their behalf. It combines a
browser extension that works in the context of the current page with a
persistent web application for conversations, saved knowledge, activity, and
agent execution history.

The platform is being built toward a provider-neutral browser-agent harness
that can turn a user's intent and browsing context into safe, observable
action. Models decide what to do, typed tools describe what can be done, and
the Repin runtime owns execution, approvals, browser state, retries, memory,
and observability.

## Product direction

Repin is organized around three connected capabilities:

1. **Understand** — use the active page, selected text, conversation, and user
   intent to provide relevant assistance in context.
2. **Remember** — preserve useful pages, notes, highlights, conversations, and
   trusted memories in a workspace the user controls.
3. **Act** — use explicit, typed browser tools to complete work with clear
   permission boundaries, observable execution, and human approval for
   consequential actions.

The browser extension is Repin's contextual surface, while the web application
is its durable workspace. Knowledge, conversations, preferences, and execution
history should follow the authenticated user across both surfaces. The current
system provides the foundation for this direction; fully autonomous operation
remains an incremental product goal.

## Current foundation

- Contextual AI actions for explaining, summarizing, translating, and chatting
  about pages or selected text
- A persistent library for pages, bookmarks, notes, and highlights
- Scoped, source-aware memories that can be retrieved as agent context
- Persistent assistant conversations with resumable run history
- Browser-tool execution through a connected extension or a managed Playwright
  session
- Typed browser tools, human approval boundaries, cancellation, retries, and
  post-action verification
- Workflow definitions, execution, deterministic goal validation, and task
  routing
- Separate interactive and background BullMQ execution lanes
- Cookie-based web authentication and PKCE-based extension authorization
- OpenTelemetry traces and metrics with OTLP export
- Shared contracts, API client state, and UI components across product clients

## Repository structure

| Path                         | Responsibility                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `apps/server`                | NestJS API, authentication, AI orchestration, agent runs, browser tools, workflows, queues, and persistence   |
| `apps/web`                   | Next.js web application for conversations, activity, saved content, settings, and extension authorization     |
| `apps/extension`             | WXT React extension with contextual UI, background coordination, browser tools, and browser-session transport |
| `apps/docs`                  | Next.js documentation application                                                                             |
| `packages/client`            | Shared HTTP, React Query, authentication, and client-state utilities                                          |
| `packages/contracts`         | Framework-neutral wire contracts and Zod schemas                                                              |
| `packages/ui`                | Shared React UI components and rich-content primitives                                                        |
| `packages/observability`     | Provider-neutral telemetry names, attributes, events, and helpers                                             |
| `packages/eslint-config`     | Shared ESLint configuration                                                                                   |
| `packages/typescript-config` | Shared TypeScript configuration                                                                               |

## Architecture

The web application and browser extension are first-class clients of the same
backend capabilities.

```text
Web application ───────┐
                       ├── NestJS API ── PostgreSQL
Browser extension ─────┤       │
                       │       ├── Redis / BullMQ
Managed browser ───────┘       ├── AI provider adapter
                               └── Agent harness and typed browser tools
```

Important boundaries:

- AI providers handle model input and output only. Agent state and tool
  execution remain provider-neutral.
- Business logic and durable data live on the server rather than in product
  clients.
- Browser-dependent commands execute through the connected extension or the
  managed Playwright executor.
- Shared transport shapes belong in `packages/contracts`.
- Domain-agnostic server helpers belong in
  `apps/server/src/shared/utils/helper.ts`.

See [AGENTS.md](./AGENTS.md) for the complete engineering and architecture
guidelines.

## Technology

- Node.js 22.18 or newer and pnpm 9
- TypeScript and Turborepo
- NestJS, TypeORM, PostgreSQL, Redis, and BullMQ
- Next.js 16, React 19, Tailwind CSS, and shared shadcn-style primitives
- WXT for Chromium and Firefox extension builds
- OpenAI-compatible provider APIs behind a provider abstraction
- Playwright for managed browser sessions
- OpenTelemetry for traces and metrics

## Getting started

### Prerequisites

- Node.js `>=22.18.0`
- pnpm `9.x` through Corepack
- Docker with Docker Compose, or local PostgreSQL and Redis instances
- An API key for the configured AI provider to use AI capabilities

Enable pnpm and install the workspace:

```bash
corepack enable
pnpm install
```

### Local development

1. Start PostgreSQL and Redis:

   ```bash
   docker compose up -d postgres redis
   ```

2. Create application environment files:

   ```bash
   cp apps/server/.env.example apps/server/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

3. Add `AI_API_KEY` to `apps/server/.env`. Adjust `AI_PROVIDER`,
   `AI_BASE_URL`, and `AI_MODEL` when using another OpenAI-compatible provider.

4. Apply database migrations:

   ```bash
   pnpm --filter server migration:run
   ```

5. Start the product surfaces in separate terminals:

   ```bash
   pnpm --filter server start:dev
   pnpm --filter web dev
   pnpm --filter extension dev
   ```

The default development URLs are:

- Web application: `http://localhost:3000`
- API: `http://localhost:3001/api`
- Swagger UI: `http://localhost:3001/docs` when `ENABLE_SWAGGER=true`

The documentation application currently defaults to port `3001`, which is
also the API development port. Run it on another port while developing the
full stack:

```bash
pnpm --filter docs exec next dev --port 3002
```

### Load the browser extension

Running `pnpm --filter extension dev` starts WXT development mode and creates a
development browser bundle. Follow the WXT terminal instructions, or load the
generated unpacked extension from the extension's `.output` directory.

The extension defaults to:

- Repin API: `http://localhost:3001`
- Repin web application: `http://localhost:3000`

Use the extension popup to authorize it through the web application. Unpacked
development extension IDs are accepted when `EXTENSION_CLIENT_IDS` is empty.
Production environments should configure the permitted extension IDs.

Firefox development and production builds are also available:

```bash
pnpm --filter extension dev:firefox
pnpm --filter extension build:firefox
```

## Docker Compose

Copy the root environment template and configure the AI provider:

```bash
cp .env.example .env
docker compose up --build
```

This starts the web application, API, PostgreSQL, and Redis. The server
container applies TypeORM migrations before starting.

The extension is a build artifact rather than a long-running service. Export a
Chromium MV3 bundle to `extension-dist` with:

```bash
docker compose --profile extension run --rm extension
```

The default credentials in the example and Compose files are for local
development only. Replace all secrets in deployed environments.

## Common commands

Run commands from the repository root unless noted otherwise.

```bash
# Build every buildable workspace
pnpm build

# Lint the workspace
pnpm lint

# Type-check the workspace
pnpm check-types

# Format TypeScript, TSX, and Markdown
pnpm format

# Run server unit tests
pnpm --filter server test

# Run server end-to-end tests
pnpm --filter server test:e2e

# Build browser-extension archives
pnpm --filter extension zip
```

Useful migration commands:

```bash
pnpm --filter server migration:show
pnpm --filter server migration:run
pnpm --filter server migration:revert
pnpm --filter server migration:create -- MigrationName
pnpm --filter server migration:generate -- MigrationName
```

## Configuration

The authoritative templates are:

- Root Docker Compose configuration: [`.env.example`](./.env.example)
- Server configuration: [`apps/server/.env.example`](./apps/server/.env.example)
- Web server-side proxy configuration:
  [`apps/web/.env.example`](./apps/web/.env.example)

Core server configuration groups include:

- PostgreSQL and Redis connections
- JWT secrets and token lifetimes
- Allowed CORS origins and extension client IDs
- AI provider, model, base URL, API key, and request timeout
- Assistant queue rate limits, scaling thresholds, and run deadlines
- Swagger and OpenTelemetry settings

Never commit real credentials or production secrets.

## API and runtime notes

- All REST endpoints use the `/api` prefix.
- Authentication supports secure cookies for the web app and bearer tokens for
  extension flows.
- Assistant and workflow progress is streamed using authenticated
  Server-Sent Events, with persisted state available for reconnection.
- Extension browser sessions connect through the authenticated
  `/api/browser-sessions/connect` WebSocket upgrade endpoint.
- Potentially consequential browser tools require explicit approval according
  to the browser action policy.
- Interactive and long-running browser work use separate BullMQ queues to keep
  ordinary assistant responses responsive.

More detailed server notes live in:

- [`apps/server/src/shared/docs/execution-foundation.md`](./apps/server/src/shared/docs/execution-foundation.md)
- [`apps/server/src/shared/docs/workflow-runtime.md`](./apps/server/src/shared/docs/workflow-runtime.md)
- [`apps/server/src/shared/docs/task-routing.md`](./apps/server/src/shared/docs/task-routing.md)
- [`apps/server/src/shared/docs/memory.md`](./apps/server/src/shared/docs/memory.md)
- [`apps/server/src/shared/docs/prompts.md`](./apps/server/src/shared/docs/prompts.md)

## Engineering expectations

Contributions should preserve the product's cross-client architecture and
provider-neutral agent runtime. Keep implementations focused, typed, secure,
and proportional to the requirement. Reuse shared contracts and UI primitives,
avoid placing business logic in controllers or extension content scripts, and
add migrations for every database schema change.
