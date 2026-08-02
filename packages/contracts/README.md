# `@repo/contracts`

Framework-neutral contracts shared by Repin's server, browser extension, and
future clients.

## Boundaries

- Keep this package free of NestJS, React, WXT, and browser runtime imports.
- Export wire-safe values only. Dates are ISO 8601 strings at the boundary.
- Treat page and selection context as untrusted input on the server.
- Add new message variants through discriminated unions and increment
  `REPIN_PROTOCOL_VERSION` for breaking protocol changes.
- Runtime validation remains the responsibility of transport-specific DTOs.
  Shared contracts describe the wire shape but do not replace server-side
  validation.

Import from a focused entry point where practical:

```ts
import type { CreateAssistantRunRequest } from "@repo/contracts/assistant";
```
