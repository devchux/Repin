# Highlights

Highlights are user-owned selected passages captured from a page by the
extension or web application. Each record stores the exact quote, source URL,
page title, optional neighboring text (`prefix` and `suffix`), note, color, and
capture time. Neighboring text helps a client locate the quote if the page has
multiple identical passages. The server stores these selectors as data; the
client owns DOM matching and visual rendering.

## API

All routes require authentication and scope reads and writes to the current
user.

- `POST /api/highlights` creates a highlight. `url`, `pageTitle`, and `quote`
  are required.
  An optional `clientId` UUID makes repeated requests return the same record
  with `created: false`.
- `GET /api/highlights` lists newest-first records with pagination. `search`
  matches quote, note, and page title; `url` filters to a normalized source
  page; `color` filters by color.
- `GET /api/highlights/:id` reads one highlight.
- `PATCH /api/highlights/:id` edits its note or color.
- `DELETE /api/highlights/:id` soft-deletes it.

The `highlight_selection` agent tool saves a quote through the same service
when the user explicitly asks. It does not require a browser session once the
page URL and selected text are available. Agent tool inputs remain untrusted
and are validated before persistence.
The agent harness passes its idempotency key as `clientId` so retries cannot
create duplicate highlights.

Run `CreateHighlights1789660800000` before using this resource.

## Current limitations

- The extension saves selected text from its toolbar and restores saved colors
  on revisit or refresh through the CSS Custom Highlight API. Older browsers
  without that API cannot render the color.
- The web highlights page still uses sample data rather than this API.
- Prefix and suffix improve relocation but do not guarantee a match after the
  source page changes. The extension skips a quote when its saved surrounding
  text no longer matches, avoiding a misleading color on a different passage.
- Highlight search is lexical; unified search across notes, bookmarks, and
  highlights remains future work.
