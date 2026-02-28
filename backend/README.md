# Backend Service

The backend is a Fastify service written in TypeScript. It uses Prisma as an ORM
for PostgreSQL and Vitest for unit testing.

Plugins live under `src/plugins`; currently only `sensible` is included. An earlier
`support` plugin was removed as unused during review.

## Getting Started

```bash
cd backend
npm install          # install dependencies
```

### Environment Variables

- `DATABASE_URL` – PostgreSQL connection string used by Prisma (e.g.
  `postgresql://postgres:postgres@localhost:5432/postgres`)
- `PORT` – port the Fastify server listens on (defaults to `3000`). The
  server logs the resolved value at startup for easier debugging.

### Health Endpoint

- `GET /health` – simple health-check that responds with `{ status: 'ok' }`.
  this is used by the docker-compose healthcheck and any orchestration tooling.

### Development

```bash
npm run dev           # compile TS and run server with live reload
```

The first build may require a free port; the default is 3000. Use `PORT` to
override when necessary.

### Testing

Unit and lightweight integration tests are driven by Vitest and live under
`backend/test/`. They cover server startup, Prisma connectivity, and utility
functions. A heavier end-to-end smoke test now resides separately under the
root `e2e/` directory and exercises the full stack with Playwright.

A helper located at `e2e/compose-helper.ts` wraps
[Testcontainers](https://www.testcontainers.org/) and spins up the same
`docker-compose.yml` stack programmatically – this allows end-to-end tests to
run in CI without requiring manual container management. The smoke test at
`e2e/playwright-smoke.test.ts` now invokes the helper in `beforeAll`/`afterAll`
so it manages the stack lifecycle itself. The top-level `npm run test:e2e`
script simply installs Playwright browsers and invokes the e2e test; the
stack is started by the test itself. The script is a convenience for CI and
cron jobs.

```bash
npm run test
```

### Database

Prisma handles schema migrations. After editing `prisma/schema.prisma` or
adding models, run:

```bash
npx prisma migrate dev --name <migration-name>
```

Make sure `DATABASE_URL` is set to a running PostgreSQL instance (a container is
recommended).

### Docker-compose

A `docker-compose.yml` file at the repo root defines frontend, backend, and a
PostgreSQL database for local development. The stack defaults to using ports
3000 (frontend), 4000 (backend) and 5432 (database) but these can be overridden
via environment variables (see top‑level README for details).

To start the full stack:

```bash
docker compose up --build
```

and to tear it down:

```bash
docker compose down
```

Backend-specific environment variables of note:

- `DATABASE_URL` – connection string for Prisma; the compose file injects a
  value pointing at the `postgres` service on the default network.
- `PORT` – port the Fastify server listens on; overridden by compose to
  `${BACKEND_PORT:-4000}`.
