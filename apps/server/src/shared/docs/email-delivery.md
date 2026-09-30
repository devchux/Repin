# Transactional email

Repin sends authentication email through the provider-neutral `EmailModule`.
Authentication owns message purpose and templates; transport implementations
only deliver an `EmailMessage`. This keeps login and account workflows
independent from Resend, SMTP, and SendGrid.

## Configuration

Set `EMAIL_PROVIDER` to `resend`, `smtp`, or `sendgrid` in production. The
`log` provider is available outside production for local development and logs
the message instead of contacting a provider. Production startup fails when
`log` or an incomplete provider configuration is used.

All providers require:

- `EMAIL_FROM_ADDRESS`
- `EMAIL_FROM_NAME` (defaults to `Repin`)

Provider credentials:

- Resend: `RESEND_API_KEY`
- SendGrid: `SENDGRID_API_KEY`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and optionally
  `SMTP_USER`/`SMTP_PASSWORD` when the relay requires authentication

## Authentication integration

Login and registration generate a six-digit, single-use code. Only an HMAC
hash of the code is stored in Redis, with a ten-minute TTL. Email delivery must
succeed before the request reports success; a delivery failure removes the
cached code so an undelivered code cannot remain active.

Email changes use a separate authenticated challenge keyed by user ID:

1. The user submits a new, unused email address.
2. Repin sends a code to the new address while retaining the existing address.
3. The user confirms the code.
4. Repin consumes the challenge, updates the address, and rotates the web
   access and refresh credentials.

The delivery interface is intentionally synchronous for now. A future BullMQ
producer can be placed behind `EmailService` without coupling authentication to
queue infrastructure. Authentication codes should remain short-lived and
should not be retried after their expiration window.
