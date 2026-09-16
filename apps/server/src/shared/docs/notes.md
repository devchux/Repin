# Notes

Notes are user-owned records independent of saved pages. They can originate in
the web workspace or extension, and optionally retain a source URL and selected
text. The `note` field on a saved page remains page-specific metadata.

The authenticated `/api/notes` API supports create, paginated list and search,
read, update, and soft delete. Every read and mutation is scoped to the
authenticated user. The extension submits notes through its background context
so access tokens remain unavailable to content scripts.

Run `CreateNotes1789401600000` before using the feature. Notes currently store
plain text; rich-text formatting, source relationships beyond URLs, and agent
tool access can be added using this resource as the shared domain boundary.
