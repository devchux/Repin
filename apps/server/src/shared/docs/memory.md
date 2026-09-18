# Memory resource

Repin memory is durable user context, separate from conversation history and
temporary browser run state. A memory stores a concise fact or instruction. Its
source records explain where that information came from.

The first version deliberately supports only:

- explicit user and agent memories;
- global, project, domain, and conversation scopes;
- source provenance with server-assigned trust;
- bounded lexical listing and context retrieval;
- permanent deletion through the forget endpoint.

`GET /api/memories/context` returns global memories plus an optional exact
scope match. Its maximum of 20 records is an intentional context-size boundary.
Browser-page sources are always marked `untrusted`; this metadata does not turn
page content into an instruction or grant permission to perform an action.

At the start of an agent run, the harness loads at most ten global and
current-domain memories into one compact system message. It does not repeat the
lookup on every tool iteration and does not inject full source documents.

Semantic embeddings, automatic extraction, conflict resolution, consolidation,
and knowledge graphs are deferred until usage data shows they are necessary.
