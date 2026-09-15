# Bookmarks

Bookmarks are durable, user-owned records captured by the extension or web
application. They retain source metadata, optional readable content, selected
text, notes, and tags so later assistant capabilities can use the record rather
than relying on a URL alone.

## API

All routes require an authenticated user. Records are always scoped by the
authenticated user ID.

- `GET /api/bookmarks` returns newest-first paginated records. `search`
  searches title, description, note, and URL. Repeated `tags` query parameters
  require all specified tags.
- `POST /api/bookmarks` saves a page captured by the web application or
  extension. Saving the same normalized URL again returns the existing record
  with `created: false`.
- `GET /api/bookmarks/:id` returns the complete bookmark record.
- `PATCH /api/bookmarks/:id` updates captured metadata, note, content, or tags.
- `DELETE /api/bookmarks/:id` soft-deletes the record.

URLs are normalized for identity by removing fragments and common tracking
parameters, sorting query parameters, and preferring the canonical URL when one
was captured. A partial unique index prevents concurrent duplicate saves while
allowing a previously deleted page to be saved again.

## Save capability

Creation is exposed to the agent harness as the typed `bookmark_page` application tool. The tool validates untrusted arguments and calls the bookmark service.
When invoked during an assistant run, its input, result, failure, and timing are
recorded by the existing run-step activity infrastructure. It does not require
a live browser session when the page context is already available.

## Rename from saved pages

The bookmark migration renames the existing `saved_pages` table and its indexes
in place, preserving records and IDs. Clients should use `/api/bookmarks` and
the `bookmark_page` tool name; the former `/api/saved-pages` route and
`save_page` tool name are no longer registered.

## Current limitations

- Search is lexical rather than semantic.
- Collections, AI enrichment, and full content version history are not part of
  the first slice.
- Captured page content is trusted only as data and must never be treated as
  instructions by future agent tooling.
