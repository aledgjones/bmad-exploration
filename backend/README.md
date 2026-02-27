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

### Development

```bash
npm run dev           # compile TS and run server with live reload
```

The first build may require a free port; the default is 3000. Use `PORT` to
override when necessary.

### Testing

Unit tests are driven by Vitest. There is a basic smoke test that verifies the
server can start and that Prisma can connect to the configured database.

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

We also provide a `docker-compose.yml` at the repo root defining the backend
service and a PostgreSQL database for local development. Use
`docker compose up` to start both services.
