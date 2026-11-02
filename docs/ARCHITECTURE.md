# Architecture

## Request flow

1. The React SPA calls same-origin `/api/*`. Vite proxies in development; Nginx proxies in Docker.
2. Express applies Helmet, CORS, JSON/cookie parsing, request logging, and route-level rate limits.
3. The auth middleware accepts either the `ox_token` httpOnly cookie or an `Authorization: Bearer` token, verifies the JWT, and attaches `{ id, email }` to the request.
4. Controllers validate with Zod, delegate to services, and return `{ data }`.
5. The error middleware maps domain errors to 4xx responses and hides internals behind a generic 500.

Controllers stay thin. Services own business rules and Prisma access so they can be tested independently of HTTP.

## Data model

- `users` owns contacts and campaigns.
- `contacts` are unique per user by email. Status is `active` or `unsubscribed`.
- `campaigns` hold subject/content, audience type and selected contact IDs, lifecycle status, and scheduling timestamps.
- `campaign_logs` are the delivery ledger: one row per campaign/contact pair, unique by `(campaign_id, contact_id)` and by `provider_message_id`.

Indexes exist for the actual access paths:

- `contacts (user_id, id)` for keyset list pages.
- `contacts (user_id, status, id)` for filtered list pages.
- `campaign_logs (campaign_id, status)` for per-campaign counts.
- `campaign_logs (campaign_id, sent_at)` for recent log pages.
- Unique indexes on `users.email`, `contacts (user_id, email)`, and `campaign_logs.provider_message_id`.

All entities use auto-increment integer primary keys. `campaign_logs.id` doubles as a cheap, stable keyset cursor for delivery-log pages.

## Cursor pagination

List endpoints accept `cursor` and `limit` (1-100, default 25). A cursor is the base64url encoding of a scope plus the last seen numeric ID. The query fetches `id < cursor`, orders descending, and requests `limit + 1` rows to determine `nextCursor`.

This avoids `OFFSET` scans, prevents duplicate rows when new contacts arrive between page loads, and keeps the API contract independent of total row count. Search and status filters are applied before the keyset predicate so the index can still be used.

## CSV ingestion

`POST /api/contacts/import` uses multer memory storage with a 5 MB limit. The file buffer is streamed through `csv-parse` and accumulated into batches of 500, validated with Zod, and inserted with `createMany({ skipDuplicates: true })`.

Limits:

- 20,000 rows per import.
- Duplicate emails inside a file and against existing rows are skipped.
- Each row is normalized (trimmed, lowercased email, blank optional fields dropped).
- Invalid rows are counted and reported rather than aborting the entire file.

A production system would move large imports to a queued job with progress reporting, but the streaming approach keeps memory bounded for the demo.

## Campaign dispatch

1. `POST /campaigns/:id/dispatch` verifies ownership and that the campaign is `draft` or `scheduled`.
2. The service counts matching active contacts, rejects audiences above 5,000 recipients, and completes empty audiences without sending.
3. Status moves to `sending` with `dispatchStartedAt`.
4. Recipients are processed in batches of 20 through the provider interface, with each batch awaited before the next one starts.
5. Logs are written in batches; then the campaign moves to `completed` with `sentAt` and `completedAt`.

The long-running server polls every 30 seconds for `scheduled` campaigns that are due and runs the same dispatch service. On Vercel, a GitHub Actions job calls the protected `/api/internal/dispatch-due` endpoint every five minutes instead. Dispatch is intentionally single-instance for the demo. The provider interface is the seam where a real transactional email provider, retry policy, and idempotency key would live.

## Webhooks

`POST /api/webhooks/email` reads the raw body (mounted before JSON parsing for that route), computes HMAC-SHA256 with `WEBHOOK_SECRET`, and compares with `crypto.timingSafeEqual`.

Accepted events:

- `opened` upgrades `sent` to `opened` and stamps `openedAt`.
- `clicked` upgrades `sent` or `opened` to `clicked` and stamps `clickedAt`.

The update is conditional on the current status, so late or out-of-order events cannot downgrade a log. Unknown message IDs return 404 so a provider retries a genuinely delayed send. Invalid signatures return 401 and never reach the database.

## Analytics

`GET /analytics/overview` returns:

- totals for contacts, campaigns, and messages
- counts for sent, opened, clicked, and per-status breakdowns
- open and click rates
- a funnel (`sent -> opened -> clicked`)
- a per-day series for the selected 7, 30, or 90 day range
- per-campaign performance for the dashboard table

Counts use Prisma `groupBy`. The daily series uses one raw SQL aggregation grouped by date, avoiding a query per day and avoiding loading logs into Node.

## Frontend structure

- `services/` contains typed fetch wrappers and domain modules.
- `features/` contains feature-scoped components such as auth context, dashboard charts, and contact modals.
- `components/ui/` is the small design system: buttons, inputs, cards, badges, modal, toast, skeletons.
- `pages/` are route-level views, lazy-loaded in `App.tsx`.
- SWR handles caching, revalidation, and loading/error states.
- The design is intentionally flat: slate neutrals, one blue accent, 1px borders, dense tables, no decorative gradients.

## Security notes

- Passwords are hashed with bcrypt (cost 10 in the demo, higher in production).
- JWTs are httpOnly, sameSite=lax, and `secure` when configured.
- Zod validates every write payload; Prisma parameterizes queries.
- Rate limits apply globally to the API, more tightly to auth, and separately to webhook traffic.
- CORS is restricted to one configured origin.
- Webhook signatures are verified before parsing, with constant-time comparison.
- Secrets are never returned by the API; the settings page shows the integration contract, not the secret value.
