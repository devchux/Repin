# Task Routing

The `task` resource is Repin's user-facing execution entry point. It selects an
execution boundary but does not execute assistant runs or workflows itself.

```text
POST /api/tasks
        |
        v
SelectionService
   |          |
   v          v
assistant   workflow
```

The selector compares a request only with the authenticated user's latest
workflow definitions that declare `activation` metadata. A structured provider
decision must identify an exact candidate, classify the task as multi-stage,
and have at least `0.75` confidence. Otherwise the request safely remains a
direct assistant run. A deterministic lexical fallback is used if the provider
is unavailable.

Responses include `kind: "run"` or `kind: "workflow"`. Callers may force a path
with `selectionMode`; forcing a workflow also requires `workflowDefinitionId`.

Workflow definitions can set an agent node's `contextSource` or `inputSource`
to `task`, allowing the workflow runtime to inject the original task without
making the task resource responsible for node execution.

```json
{
  "key": "product-research",
  "name": "Product research",
  "activation": {
    "description": "Research and compare products before recommending one",
    "examples": ["Research three laptops and recommend the best one"]
  },
  "graph": {
    "startNodeId": "research",
    "nodes": [
      {
        "id": "research",
        "type": "agent",
        "capability": "chat",
        "context": {
          "url": "https://example.com",
          "title": "Product research",
          "pageContent": "Research products"
        },
        "contextSource": "task",
        "inputSource": "task"
      },
      { "id": "done", "type": "end" }
    ],
    "edges": [{ "from": "research", "to": "done" }]
  }
}
```
