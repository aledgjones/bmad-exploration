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

Additional commands will be added as services are scaffolded.
