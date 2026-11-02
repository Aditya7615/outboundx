# OutboundX

A full-stack outbound marketing campaign manager for B2B teams: manage audiences, build campaigns, dispatch personalized email through a provider abstraction, and track engagement through signed webhooks.

**Live demo:** https://outboundx-phi.vercel.app  
Demo login: `demo@outboundx.dev` / `Demo@12345`

Built as a portfolio project for the Outbox SDE Intern application, with an emphasis on the parts of the job that are easy to claim and harder to demonstrate: schema design and indexing, cursor pagination, streamed CSV ingestion, background dispatch, webhook security, typed API contracts, and tests.

## Stack

| Layer | Technology |
| --- | --- |
| API | Node.js, Express, TypeScript, Zod |
| Database | MySQL 8, Prisma ORM, SQL migrations |
| Auth | JWT in httpOnly cookie, Bearer support, bcrypt |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, SWR |
| Charts | Recharts |
| Tests | Jest, Supertest, ts-jest |
| Infra | Docker Compose, Nginx, GitHub Actions |

## Product surfaces

- **Dashboard** - sent/opened/clicked totals, reply-ready funnel, 14-day engagement chart, campaign performance table.
- **Audiences** - cursor-paginated contacts, debounced search, status filters, CSV import, CRUD.
- **Campaigns** - draft/scheduled/sending/completed lifecycle, three-step builder, audience targeting, per-campaign analytics and delivery logs.
- **Settings** - API surface, Swagger link, webhook endpoint and HMAC verification contract.
- **Auth** - register/login, protected routes, demo workspace.

## Quick start with Docker

```bash
cp .env.example .env
docker compose up --build
```

- App: http://localhost:8080
- API: http://localhost:4000
- Swagger: http://localhost:4000/api/docs

The API container applies migrations and seeds the demo workspace on first start.

Demo login: `demo@outboundx.dev` / `Demo@12345`

## Local development

Prerequisites: Node.js 22+, MySQL 8+.

```bash
npm install
cp backend/.env.example backend/.env
```

Create the database and point `DATABASE_URL` at it, then:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:4000
- Swagger: http://localhost:4000/api/docs

Vite proxies `/api` and `/health` to the API, so the frontend uses same-origin requests in development and production.

## Deployment

The hosted demo runs the SPA and the Express API as a single Vercel project, backed by an Aiven MySQL service:

- `vercel.json` builds the frontend and routes every `/api/*` request to `api/[...path].ts`, which invokes the same Express app used locally.
- `GET /health` and `/api/docs` are served by the same function.
- Because Vercel has no long-running process, `.github/workflows/dispatch.yml` invokes `POST /api/internal/dispatch-due` every five minutes with the `CRON_SECRET` bearer token. Docker Compose keeps the in-process 30-second scheduler.

Required production environment variables: `DATABASE_URL`, `JWT_SECRET`, `WEBHOOK_SECRET`, `CRON_SECRET`, `COOKIE_SECURE=true`, `CORS_ORIGIN`, and `LOG_LEVEL`. GitHub Actions also needs `APP_URL` and `CRON_SECRET` repository secrets.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run API and web concurrently |
| `npm run build` | Production builds for both workspaces |
| `npm run test` | Backend Jest suite |
| `npm run typecheck` | TypeScript checks for both workspaces |
| `npm run lint` | ESLint for both workspaces |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:reset` | Reset schema and reseed |
| `npm run webhook:test -w backend` | Send a signed local webhook for the latest log |

## Architecture

```
React SPA (Vite)
  |  fetch /api/* (cookie or Bearer)
  v
Express API
  |-- controllers   request validation + status codes
  |-- services      auth, contacts, campaigns, analytics, webhooks
  |-- scheduler     30s poll for due campaigns
  |-- provider      mock email provider (swap-in interface)
  v
Prisma -> MySQL
```

Key implementation choices:

- **Keyset pagination** on `(id)` with an opaque base64url cursor. Avoids `OFFSET` degradation and keeps list pages stable while rows are inserted.
- **Streamed CSV import** with `csv-parse`, batched `createMany` (500 rows), a 20,000 row ceiling, and duplicate-safe inserts.
- **Dispatch pipeline** transitions campaigns to `sending`, sends with concurrency 20 through a provider interface, writes logs, then marks `completed`.
- **Signed webhooks** verify HMAC-SHA256 over the raw body before JSON parsing. Log status only moves forward: `sent -> opened -> clicked`.
- **Analytics** use grouped aggregates and a raw SQL daily series rather than loading logs into application memory.
- **Indexes** cover the access paths for contact lists, campaign logs, and provider message lookups.

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/ONBOARDING.md](docs/ONBOARDING.md).

## API overview

All routes are under `/api` and return `{ "data": ... }`; errors return `{ "error": { "message": "..." } }`.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | Session lifecycle |
| GET | `/auth/me` | Current user |
| GET/POST | `/contacts` | Cursor list, create |
| PATCH/DELETE | `/contacts/:id` | Update, delete |
| POST | `/contacts/import` | CSV import |
| GET/POST | `/campaigns` | List, create |
| GET/PATCH/DELETE | `/campaigns/:id` | Detail, update, delete |
| GET | `/campaigns/:id/logs` | Cursor-paginated delivery logs |
| POST | `/campaigns/:id/dispatch` | Send now |
| GET | `/analytics/overview` | Dashboard aggregates |
| POST | `/webhooks/email` | Provider events (HMAC signed) |
| POST | `/internal/dispatch-due` | Cron-triggered dispatch (`CRON_SECRET` bearer) |
| GET | `/api/docs`, `/api/openapi.json` | Swagger UI and OpenAPI spec |

## Testing

The backend suite covers pagination cursors, analytics helpers, auth, CSV import, campaign dispatch, webhook verification, and HTTP integration routes using Supertest with a fake Prisma client.

```bash
npm run test
npm run test:coverage -w backend
```

CI runs migration, seed, lint, typecheck, and tests against MySQL 8.4, plus frontend typecheck, lint, and build.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Signing key, minimum 32 characters |
| `JWT_EXPIRES_IN` | Token lifetime, default `7d` |
| `CORS_ORIGIN` | Allowed web origin |
| `COOKIE_SECURE` | Set `true` behind HTTPS |
| `WEBHOOK_SECRET` | HMAC key for provider callbacks |
| `CRON_SECRET` | Bearer secret for the serverless dispatch endpoint |
| `SEED_DEMO` | Docker only; seed demo data on boot |

## Tradeoffs and next steps

- Email delivery is a deterministic mock provider. A real integration would add retries, provider idempotency keys, bounce handling, and a durable queue.
- Dispatch runs in-process for a single-instance demo. Production would move it to a worker with a leased job table or queue and split send fan-out from status transitions.
- Analytics are computed on demand. At larger volumes these aggregates belong in rollup tables or a warehouse.
- The app uses one workspace per user. Multi-tenant workspaces and role-based permissions are the next schema change.
