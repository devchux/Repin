# Memory resource

Repin memory is durable user context, separate from conversation history and
temporary browser run state. A memory stores a concise fact or instruction. Its
source records explain where that information came from.

The first version deliberately supports only:

- explicit user and agent memories;
- global, project, domain, and conversation scopes;
- source provenance with server-assigned trust;
- hybrid semantic and full-text retrieval with structured filters;
- permanent deletion through the forget endpoint.

`GET /api/memories/context` ranks global memories plus an optional exact scope
match against `query`. Ranking combines full-text relevance, embedding cosine
similarity, exact-scope preference, and a small recency tie-breaker. Its maximum
of 10 records is an intentional context-size boundary.
Semantic-only candidates must meet `MEMORY_MINIMUM_SEMANTIC_SIMILARITY`
(default `0.55`); exact full-text matches remain eligible independently. Ranking
weights and scope boosts can be tuned with the `MEMORY_*_WEIGHT` and
`MEMORY_*_SCOPE_BOOST` environment variables without changing retrieval code.
Browser-page sources are always marked `untrusted`; this metadata does not turn
page content into an instruction or grant permission to perform an action.

At the start of an agent run, the harness retrieves the global and
current-domain memories most relevant to the latest user message and puts at
most ten into one compact system message. It does not repeat the lookup on every
tool iteration and does not inject full source documents. If embeddings are
temporarily unavailable, full-text retrieval continues to work.

Embedding generation runs on the `memory-embedding` BullMQ queue with retry and
exponential backoff. A recurring bounded backfill job finds legacy memories
without vectors and queues them without delaying API requests. Status, failure
reason, and completion time are stored on each memory. Retrieval emits tracing
and result-count metrics split between hybrid and full-text fallback modes.

The harness also exposes `memory_remember`, `memory_search`, and
`memory_forget`. Search is read-only. Remember and forget execute only when the
current user message explicitly asks to save or remove memory; a model tool call
by itself is not treated as consent.

Saved notes, highlights, bookmarks, and pages live in the separate library
resource. `POST /api/memories/from-source` verifies that the library item belongs
to the user, derives trust from its type, and prevents the same source from
creating an identical memory twice. Forgetting a memory does not delete its
library source.

Automatic extraction, conflict resolution, consolidation, and knowledge graphs
are deferred until usage data shows they are necessary.
