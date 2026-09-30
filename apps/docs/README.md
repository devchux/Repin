# Repin documentation

Repin's public documentation is built with [Mintlify](https://mintlify.com).
Pages are MDX files and site configuration lives in `docs.json`.

## Local preview

From the repository root:

```bash
pnpm install
pnpm --filter docs dev
```

The preview runs at `http://localhost:3002`.

Validate the site and its internal links before publishing:

```bash
pnpm --filter docs build
pnpm --filter docs lint
```

## Publishing

Create a Mintlify project, connect this repository, and set its docs directory
to `apps/docs`. Configure the production custom domain in the Mintlify
dashboard. Changes to the configured deployment branch are published by the
Mintlify GitHub app.

## Content conventions

- Use sentence case for headings.
- Write directly to the reader using active voice.
- Keep product guides separate from internal implementation details.
- Update a page whenever the behavior it documents changes.
- Never publish secrets, internal credentials, or private operational details.
