# Onboarding

## Prerequisites

- Node.js 22+ and npm 10+
- MySQL 8+ (or Docker)
- Optional: Docker Desktop / Colima for the full compose stack

## First run

```bash
git clone <repository-url>
cd outboundx
npm install
cp backend/.env.example backend/.env
```

Create a MySQL database and user matching `backend/.env`, for example:

```sql
CREATE DATABASE outboundx CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'outboundx'@'localhost' IDENTIFIED BY 'outboundx';
GRANT ALL PRIVILEGES ON outboundx.* TO 'outboundx'@'localhost';
FLUSH PRIVILEGES;
```

Then:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:5173 and sign in with `demo@outboundx.dev` / `Demo@12345`.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Open http://localhost:8080. The API entrypoint runs `prisma migrate deploy` and seeds the demo workspace when `SEED_DEMO=true`.

## Useful commands

```bash
npm run typecheck
npm run lint
npm run test
npm run test:coverage -w backend
npm run db:reset
npm run webhook:test -w backend -- opened
npm run webhook:test -w backend -- clicked
```

`webhook:test` picks the newest campaign log with a provider message ID, signs a payload with `WEBHOOK_SECRET`, and posts it to the local API.

## Testing strategy

- Unit tests cover pure helpers and services with a fake Prisma client: cursor encoding, analytics math, auth, CSV import, dispatch, webhook verification.
- Integration tests mount the Express app with Supertest and assert HTTP behavior for auth, contacts, and webhooks.
- CI additionally applies migrations and seeds against a real MySQL 8.4 container to catch schema drift.

Tests never require a live database, so they run quickly and deterministically.

## Troubleshooting

**Prisma cannot connect.** Confirm MySQL is running, `DATABASE_URL` is correct, and the database exists. Use `mysqladmin ping` or a client to verify credentials.

**Migration says the database is not empty.** Use `npm run db:reset` for local development, or create a fresh database.

**Vite cannot reach the API.** Start both processes with `npm run dev`, or check that the API is on port 4000. The proxy is configured in `frontend/vite.config.ts`.

**Webhook returns 401.** The signature is computed over the exact raw body. Use the helper script or copy the HMAC snippet from the Settings page.

**Docker build fails on Prisma.** The images include OpenSSL for Prisma engines. Rebuild without cache if the lockfile changed: `docker compose build --no-cache`.

**Ports already in use.** Override `API_PORT` and `WEB_PORT` in `.env`, or stop the conflicting process.

## Repository map

```
backend/
  prisma/          schema, migrations, seed, sample CSV
  scripts/         webhook helper
  src/
    config/        env + Prisma client
    controllers/   HTTP boundary
    middlewares/   auth, errors, rate limits, upload
    routes/        route tables
    services/      business logic
  tests/           unit + integration suites
frontend/
  src/
    components/    layout + UI primitives
    features/      auth, dashboard charts, contact modals
    hooks/         reusable hooks
    lib/           formatting + class helpers
    pages/         lazy route views
    services/      typed API clients
docs/
  ARCHITECTURE.md
  ONBOARDING.md
```
