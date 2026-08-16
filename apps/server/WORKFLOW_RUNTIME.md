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

## API

```text
POST /api/workflows/definitions
GET  /api/workflows/definitions/:id
POST /api/workflows/definitions/:id/instances
GET  /api/workflows/instances/:id
POST /api/workflows/instances/:id/cancel
```

Future node types—approval, external event, timer, deterministic tool, parallel
fan-out, and nested workflow—should extend this resource. They must continue to
use the agent harness for agent execution rather than introducing another loop.

Automatic assistant-versus-workflow routing is owned by the separate `task`
resource and documented in `TASK_ROUTING.md`.
