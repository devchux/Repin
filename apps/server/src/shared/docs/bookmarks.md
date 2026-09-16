# Bookmarks

Bookmarks are durable, user-owned records captured by the extension or web
application. They retain source metadata, optional readable content, selected
text, notes, and tags so later assistant capabilities can use the record rather
than relying on a URL alone.
The optional `saveReason` field records why the user saved the page.

## API

All routes require an authenticated user. Records are always scoped by the
authenticated user ID.

- `GET /api/bookmarks` returns newest-first paginated records. `searchMode`
  accepts `lexical`, `semantic`, or `hybrid` (the default). Hybrid search
  combines PostgreSQL full-text rank with cosine similarity. `collectionId`
  limits results to one collection. Repeated `tags` query parameters require
  all specified tags for lexical browsing.
- `POST /api/bookmarks` saves a page captured by the web application or
  extension. Saving the same normalized URL again returns the existing record
  with `created: false`.
- `GET /api/bookmarks/:id` returns the complete bookmark record.
- `PATCH /api/bookmarks/:id` updates captured metadata, note, content, or tags.
- `DELETE /api/bookmarks/:id` soft-deletes the record.
- `POST /api/bookmarks/:id/enrich` queues enrichment again for an existing
  bookmark.
- `GET /api/bookmark-collections` lists collections with bookmark counts.
- `POST /api/bookmark-collections` creates a collection. `PATCH` and `DELETE`
  on `/api/bookmark-collections/:id` update and delete it.
- `POST` or `DELETE /api/bookmark-collections/:id/bookmarks/:bookmarkId` adds
  or removes a bookmark. Collections are many-to-many.

URLs are normalized for identity by removing fragments and common tracking
parameters, sorting query parameters, and preferring the canonical URL when one
was captured. A partial unique index prevents concurrent duplicate saves while
allowing a previously deleted page to be saved again.

## Save capability

Creation is exposed to the agent harness as the typed `bookmark_page` application tool. The tool validates untrusted arguments and calls the bookmark service.
When invoked during an assistant run, its input, result, failure, and timing are
recorded by the existing run-step activity infrastructure. It does not require
a live browser session when the page context is already available.
The typed `search_bookmarks` tool retrieves up to five user-owned bookmarks as
short passages with source URLs. The chat prompt directs the assistant to cite
those URLs and to say when the retrieved passages do not support an answer.
The tool does not send full captured pages to the model.

## Enrichment and semantic recall

New bookmarks are queued for background enrichment in BullMQ. The worker uses
the provider-neutral AI service to generate a short summary and topic labels,
then creates a 1536-dimensional embedding. Jobs retry with exponential backoff;
the bookmark exposes `pending`, `processing`, `complete`, or `failed` status and
an actionable failure message. The `AI_EMBEDDING_MODEL` setting defaults to
`text-embedding-3-small`.

The migration enables PostgreSQL's `vector` extension and creates an HNSW
cosine index. Deployments must make the pgvector extension available to the
database role before running the migration if the role cannot install
extensions.

Search results include `passageUrl`, an original-source URL with a browser text
fragment. Supporting browsers open the source at the exact matched excerpt;
other browsers safely fall back to the source page.

## Rename from saved pages

The bookmark migration renames the existing `saved_pages` table and its indexes
in place, preserving records and IDs. Clients should use `/api/bookmarks` and
the `bookmark_page` tool name; the former `/api/saved-pages` route and
`save_page` tool name are no longer registered.

## Current limitations

- Full-text ranking currently uses English stemming.
- Text fragments depend on browser support and can stop matching if the source
  page changes substantially.
- Full captured-content version history is not yet retained.
- Captured page content is treated only as untrusted data and never as model
  instructions.
