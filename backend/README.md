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

Unit tests are driven by Vitest. There is a basic smoke test that verifies the
server can start and that Prisma can connect to the configured database.

A helper located at `backend/test/compose-helper.ts` wraps
[Testcontainers](https://www.testcontainers.org/) and spins up the same
`docker-compose.yml` stack programmatically – this allows integration tests to
run in CI without requiring manual container management. See
`backend/test/playwright-smoke.test.ts` for a sample test that launches the
frontend in a real browser and verifies the homepage loads.

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
