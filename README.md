# bmad-todo Monorepo

This repository is structured as a monorepo containing two primary services:

- `frontend/` – Next.js application (TypeScript, Tailwind, ESLint, Vitest) for the UI.
- `backend/` – Fastify service (TypeScript, Prisma, Vitest) for the API.

The top-level directory also holds shared configuration and tooling (linting, workspace scripts, etc.).

## Setup

1. Run `npm install` at the root to install workspace dependencies.
2. Each sub‑project has its own `package.json` and may require additional setup.

## Common Commands

- `npm run dev` – Start both frontend and backend in development mode (implemented via workspace scripts).
- **Frontend only:**
  - `cd frontend && npm install` – install frontend dependencies
  - `cd frontend && npm run dev` – start Next.js development server (port 3000)
  - `cd frontend && npm run test` – run frontend Vitest unit tests

**Backend only:**

- `cd backend && npm install` – install backend dependencies
- `cd backend && npm run dev` – build and start Fastify development server (port configured via `PORT`, default 3000; port value is logged on startup)
- `cd backend && npm run test` – run Vitest unit tests (includes smoke test checking server startup and Prisma connection)
- `cd backend && npx prisma migrate dev` – run Prisma migrations (requires `DATABASE_URL` pointing to Postgres)

Additional commands will be added as services are scaffolded.
