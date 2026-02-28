# bmad-todo Monorepo

This repository is structured as a monorepo containing two primary services:

- `frontend/` – Next.js application (TypeScript, Tailwind, ESLint, Vitest) for the UI.
- `backend/` – Fastify service (TypeScript, Prisma, Vitest) for the API.

The top-level directory also holds shared configuration and tooling (linting, workspace scripts, etc.).

## Setup

1. Install Node 22 (or later) and run `npm install` at the root to install workspace dependencies.
2. Each sub‑project has its own `package.json` and may require additional setup.

## Common Commands

- `npm run dev` – Start both frontend and backend in development mode (implemented via workspace scripts).
- `docker compose up --build` – launch the entire stack (frontend, backend, Postgres) via docker‑compose from repo root. Use `docker compose down` to tear it down. Ports and credentials may be overridden using environment variables (see below).

### Overriding Ports & Credentials

Compose file supports the following environment variables with sensible defaults:

| Variable                                            | Description                                | Default         |
| --------------------------------------------------- | ------------------------------------------ | --------------- |
| `BACKEND_PORT`                                      | Host port mapped to the backend container  | `4000`          |
| `FRONTEND_PORT`                                     | Host port mapped to the frontend container | `3000`          |
| `POSTGRES_HOST_PORT`                                | Host port for Postgres                     | `5432`          |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credentials for database                   | `postgres` each |

Example:

```bash
export BACKEND_PORT=5000
docker compose up --build
```

### Service-specific Usage

- **Frontend only:**
  - `cd frontend && npm install` – install frontend dependencies
  - `cd frontend && npm run dev` – start Next.js development server (port determined by `PORT`, default 3000)
  - `cd frontend && npm run test` – run frontend Vitest unit tests

- **Backend only:**
  - `cd backend && npm install` – install backend dependencies
  - `cd backend && npm run dev` – compile and start Fastify development server (port configured via `PORT`, default 4000; value is logged on startup)
  - `cd backend && npm run test` – run Vitest unit tests (includes smoke test checking server startup and Prisma connection)
  - `cd backend && npx prisma migrate dev` – run Prisma migrations (requires `DATABASE_URL` pointing to Postgres)

Additional commands will be added as services are scaffolded.
