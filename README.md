# bmad-todo Monorepo

> **Learning project** — This repository was built as a hands-on exploration of the [BMAD method](https://github.com/bmad-method/BMAD-METHOD) and AI-assisted software development practices.

## About This Project

**BMAD** is a structured, spec-first methodology for building software with AI agents. Rather than using AI in an ad-hoc way, BMAD defines a set of specialised agent personas — Analyst, Product Manager, Architect, UX Designer, Scrum Master, Developer, QA — each responsible for a specific phase of the development lifecycle. Every phase produces explicit, version-controlled artifacts (PRD, architecture docs, epics, stories, sprint plans) that accumulate as project context and guide subsequent phases.

This project built a full-stack Todo application from scratch following the complete BMAD lifecycle: requirements analysis → planning → solutioning → implementation → QA. All planning and implementation artifacts are preserved in `_bmad-output/`.

**Key deliverables and learning outputs:**

- **QA reports** (accessibility, security, performance, summary) — see [`docs/`](docs/)
- **AI integration log** and **BMAD methodology write-up** — see [`docs/ai-integration-log.md`](docs/ai-integration-log.md) and [`docs/bmad-methodology.md`](docs/bmad-methodology.md)

---

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

## Test Coverage

Both frontend and backend are configured to collect coverage with Vitest using the v8 provider. Each package enforces a **80% threshold** (lines, statements, functions, branches) natively via `coverage.thresholds` in its `vitest.config.ts` — Vitest will fail with a non-zero exit code if any metric falls below 80%.

You can run coverage for both packages with:

```bash
npm run coverage        # runs frontend & backend tests with coverage; fails if either drops below 80%
```

To run a single package:

```bash
npm run coverage:frontend
npm run coverage:backend
```
