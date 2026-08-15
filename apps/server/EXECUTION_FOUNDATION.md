# Assistant Execution Foundation

Repin executes every assistant capability through one provider-neutral harness.
The model proposes decisions, the harness owns lifecycle and persistence, and
browser executors remain typed I/O boundaries.

## Durable records

- `assistant_runs` is the user-facing run summary. `status` describes the
  lifecycle outcome, while `phase` describes the active orchestration phase.
- `assistant_run_steps` records every model invocation and tool invocation,
  including input, output, attempt, timing, and failure details.
- `assistant_run_events` is an append-only ordered execution timeline.
- `assistant_run_checkpoints` captures lifecycle state after every transition
  so a later worker can resume without relying on process memory.

Sequence and checkpoint versions are allocated while holding a pessimistic lock
on the run. Status changes, their event, and their checkpoint are committed in
one database transaction by `ExecutionService`.

## Resource boundary

The provider-neutral harness lives in `src/resources/agent`:

- `AgentModule` owns the run aggregate and exports the loop and state machine.
- `LoopService` owns model decisions, tool dispatch, verification, continuation,
  and reconciliation.
- `ExecutionService` owns durable transitions, steps, events, budgets, and
  checkpoints.

`src/resources/assistant` is an adapter over that harness. It owns assistant
conversations, capability prompts, HTTP endpoints, queue-lane dispatch, and
projecting completed run output into conversation messages. Short work and
long browser work have separate BullMQ workers, but both delegate to one shared
run handler so lifecycle, approvals, retry, cancellation, and resumption cannot
diverge. Tools and AI
providers remain independent resources consumed by `AgentModule`. Existing
table names and `/assistant` routes are retained for compatibility.

All foreign keys are also represented as explicit TypeORM relationships. The
scalar IDs remain available for efficient writes, while bidirectional relations
make ownership and navigation discoverable in the entity model. Collections
are not eager-loaded because conversations and execution histories can grow
without bound.

## Lifecycle

Statuses are deliberately small and stable:

```text
queued -> running -> completed
   |         |  \-> failed
   |         \----> queued (retry)
   \--------------> cancelled
```

Terminal statuses cannot transition. A running run moves through the phases
`initializing`, `reasoning`, `executing`, and `finalizing` before `terminal`.
Phases can repeat because autonomous execution alternates between reasoning and
tool use.

## Agent decisions

Provider responses are normalized into `AssistantAgentDecision`: either a
typed batch of tool calls or completion content. Provider adapters do not own
the loop, browser tools, checkpoints, or run state.

The current decision vocabulary intentionally matches implemented behavior.
Observation, approval, blocking, and planning decisions should be added as
discriminated-union variants when their execution semantics are implemented.

## Extension points

The next layers should build on these records rather than add parallel run
models:

1. Execution deadlines and cost budgets.
2. Rich success criteria and domain-specific verification strategies.
3. Versioned workflow definitions whose agent nodes create the same steps and
   events.
4. Event streaming and replay APIs shared by the web app and extension.

## Safe browser loop

The browser loop applies safety before execution rather than relying on model
instructions:

- Every tool has harness-owned risk, side-effect, approval, observation, and
  verification metadata.
- Element actions require a `documentRevision`. Both browser executors reject
  stale revisions; the extension invalidates revisions on DOM mutation and SPA
  navigation.
- Consequential actions create a durable approval containing the exact tool and
  arguments. Approval is fingerprinted, expires, and is consumed once.
- A run awaiting approval leaves the worker and enters `awaiting_approval`.
  Approval returns it to the queue with its existing checkpoints and budgets;
  denial terminates it explicitly.
- Model and tool-call budgets survive retries and worker restarts.
- Three identical consecutive tool actions terminate the run as a detected
  no-progress loop.
- Side-effecting actions create a separate verification step. The harness
  captures fresh navigation state when a tab remains available, or records the
  executor acknowledgement when no inspectable tab is returned. Verification
  failures are returned to the model instead of silently claiming success.

## Safety and resumability

Static tool risk is supplemented by contextual policy. Before ordinary clicks,
double-clicks, fills, or typing, the harness resolves the revision-bound target
element and classifies its accessible name, text, type, and autocomplete
metadata. Financial, communication, destructive, authentication, and sensitive
input targets require approval even when the underlying tool is normally
allowed. Sensitive input is redacted from approval payloads and durable step
records; those actions are rediscovered after approval rather than persisting
secret text in a continuation.

Before dispatch, the loop stores a single run continuation containing the model
messages, pending tool-call batch, iteration, and stable idempotency key. An
approval resumes this exact cursor instead of asking the model to reconstruct
the action. Browser disconnection or command timeout moves the run to
`suspended` and releases the worker. The user can reconnect the browser and
request resume with `POST /assistant/runs/:id/resume`.

Extension side effects use the continuation idempotency key as their command ID.
The extension persists a bounded cache of completed side-effect results before
acknowledgement, so retrying the same command returns its prior result. Managed
browser commands cannot promise executor-level deduplication; an unknown
managed outcome is therefore reported back to the model for observation and
reconciliation rather than replayed blindly.
