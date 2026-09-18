# Context Intelligence

Repin represents a browser page as a provider-neutral `PageObservation`. The
observation deliberately separates readable content blocks from interactive
elements so that article text, navigation, and actionable page state do not
collapse into one unstructured string.

## Observation model

- Content blocks retain semantic kind, heading path, visibility, viewport
  state, and frame provenance.
- Interactive elements retain their accessible name and description, role,
  safe value, validation and selection state, destination, viewport state,
  form/dialog/landmark relationships, and frame provenance.
- Password values are never captured.
- Element IDs identify context items. Observations captured by browser snapshot
  tools may additionally expose an `actionRef` tied to the observation's
  document revision. Ambiguous duplicate controls do not expose an actionable
  reference to the model.
- Existing observations remain compatible because interactive elements are an
  optional addition to schema version 1.

## Intent-specific assembly

`ContextAssemblerService` applies the token budget after ranking candidates.
Requests are classified as reading, locating, navigating, editing, submitting,
comparing, or extracting. Reading intents keep semantic content first, while
interaction intents prioritize relevant controls and their current state.
Extraction favors tables and lists; comparison favors section coverage. Query
terms, viewport proximity, and disabled state refine ranking without coupling
the harness to an AI provider.

## Freshness and safety

Both browser executors invalidate document revisions when relevant DOM content
or interaction attributes change. Every element action requires the current
revision. The agent receives a fresh structured snapshot after side effects so
it can verify the resulting state instead of assuming success.

Page content is always untrusted. Suspicious instruction-like text and
sensitive fields receive explicit risk tags. Consequential controls are still
subject to browser action policy and human approval; contextual grounding does
not bypass those boundaries.

## Visual fallback

The structured DOM observation remains the efficient default. When DOM and
accessibility information are insufficient, the existing screenshot tool can
return a provider-neutral image attachment. The agent loop passes that image as
an explicitly untrusted visual observation and avoids embedding its base64 data
inside the textual tool result.

## Performance bounds

Captures are bounded to 500 content blocks, 500 controls, 10,000 characters per
block, and 100,000 characters overall. Hidden content is excluded. Heading
context uses cached structural regions rather than scanning all headings for
every control. Context is ranked before the configured token budget is applied.

All captured page data remains untrusted and is serialized inside the existing
browser-context envelope. The observation can therefore support future
retrieval and planning improvements without moving tool execution or agent-loop
state into a provider adapter.
