# Workflow Runtime

The workflow runtime is an independent `workflow` resource. It coordinates
durable, versioned processes and delegates agent nodes to the existing
`assistant` adapter and provider-neutral `agent` harness.

## Runtime model

- `workflow_definitions` stores immutable graph versions. Creating the same key
  creates the next version instead of mutating history.
- `workflow_instances` stores lifecycle state, input, accumulated output, and
  the current node.
- `workflow_node_executions` stores one durable execution per node and links
  agent nodes to their underlying assistant run.
- `workflow_events` stores an ordered, append-only execution timeline.

Definitions are currently bounded acyclic graphs with three node types:

- `agent`: starts an idempotent run through the existing assistant queues.
- `condition`: routes on an `exists` or strict `equals` comparison over workflow
  input or prior node output.
- `end`: completes the workflow instance.

The `workflow-runtime` BullMQ worker never performs model or browser work. It
observes durable child-run state, delays itself while a child is active, and
continues from persisted node state after a restart. Cancelling a workflow also
cancels its active child run.

## Current orchestration boundary

The current runtime deliberately uses **one agent node to one assistant run**.
When an instance reaches an `agent` node, the runtime creates one
`workflow_node_executions` record and links it to at most one assistant run.
The persisted run ID makes retries and worker restarts observe the same run
instead of dispatching duplicate work.

Multiple agents can currently participate in a workflow only when each agent is
represented by a separate node. The runtime advances one `currentNodeId` at a
time, so those nodes execute sequentially according to the graph's edges.

```text
agent node A -> assistant run A -> agent node B -> assistant run B -> end
```

The following multi-agent orchestration modes are **not implemented yet**:

- multiple runs created by one agent node;
- parallel graph branches and join semantics;
- dynamic map or fan-out over runtime input;
- child-agent delegation from inside an assistant run; and
- nested workflow instances.

Workflow authors must not model a node with the expectation that it represents
a team of agents or concurrent work. Until multi-agent orchestration is added,
independent responsibilities should be expressed as separate sequential agent
nodes. Future support will require explicit child-run relationships, completion
and failure policies, concurrency limits, and durable join semantics; it should
extend this runtime without creating a second agent execution harness.

## API

```text
POST /api/workflows/definitions
GET  /api/workflows/definitions/:id
POST /api/workflows/definitions/:id/instances
GET  /api/workflows/instances/:id
GET  /api/workflows/instances/:id/events
POST /api/workflows/instances/:id/cancel
```

The authenticated events endpoint is a Server-Sent Events stream over the
instance's durable, ordered event log. Each event uses its workflow sequence as
the SSE `id`, so reconnecting clients can send `Last-Event-ID` and replay only
events they have not processed. The stream sends a heartbeat every 15 seconds
and closes after `workflow.completed`, `workflow.failed`, or
`workflow.cancelled`. The regular instance endpoint remains the recovery path
for clients that need a complete state snapshot.

Future node types—approval, external event, timer, deterministic tool, parallel
fan-out, and nested workflow—should extend this resource. Multi-agent execution
is future scope, not an implicit behavior of the current `agent` node. These
features must continue to use the agent harness for agent execution rather than
introducing another loop.

Automatic assistant-versus-workflow routing is owned by the separate `task`
resource and documented in `task-routing.md`.
