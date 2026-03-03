# Story 5.1: Production-ready Dockerfiles

Status: review
Assignee: AI

## Story

As a DevOps engineer,
I want both Dockerfiles to use multi-stage builds, run as non-root users, and produce production-optimised images,
So that the containers follow security best practices and are deployment-ready.

## Acceptance Criteria

1. **Given** the backend Dockerfile,
   **When** I build the image,
   **Then** it uses a multi-stage build (separate `build` and `production` stages), installs only production dependencies in the final stage, and runs as a non-root user.

2. **Given** the frontend Dockerfile,
   **When** I build the image,
   **Then** it uses a multi-stage build, runs `next build` in the build stage, serves via `next start` in the production stage, and runs as a non-root user.

3. **Given** the updated images,
   **When** I run `docker compose up --build`,
   **Then** all three services (postgres, backend, frontend) start, pass their health checks, and the app is fully functional.

4. **Given** either running container,
   **When** I inspect the running process user,
   **Then** it is NOT root (e.g. `node` or a custom non-root user).

## Tasks / Subtasks

- [x] Refactor `backend/Dockerfile` to multi-stage build (build stage compiles TS + generates Prisma client; prod stage copies dist + runs as non-root `node` user)
- [x] Refactor `frontend/Dockerfile` to multi-stage build (build stage runs `next build`; prod stage copies `.next` output + runs `next start` as non-root `node` user)
- [x] Add `USER node` to both Dockerfiles
- [x] Verify `docker compose up --build` works end-to-end
- [x] Verify health checks pass for all services

## Dev Notes

- Node 22-alpine images include a built-in `node` user (uid 1000) — no need to `adduser`.
- Frontend must switch from `npm run dev` to `npm run build` + `npm start`.
- Backend already builds TS and runs `node dist/start.js` — just needs stage separation and dependency pruning.

## Dev Agent Record

### Implementation Plan

- `backend/Dockerfile`: Added `build` stage (full install → `prisma generate` → `build:ts`) and `production` stage (prod-only `npm install --omit=dev`, copy `dist/`, copy `.prisma` + `@prisma` client artefacts, copy `prisma/` schema, `USER node`).
- `frontend/Dockerfile`: Added `build` stage (full install → `next build`) and `production` stage (prod-only `npm install --omit=dev`, copy `.next/` + `public/`, `USER node`, `CMD ["npm", "start"]`).
- Used `npm install` instead of `npm ci` because the project uses npm workspaces — lock files live at the monorepo root, not inside the sub-package directories, so the sub-package Docker build contexts cannot access them.
- Prisma client artefacts (`node_modules/.prisma` and `node_modules/@prisma`) are copied from the build stage rather than re-generated in the production stage, keeping the prod image lean while ensuring the client is available at runtime.

### Completion Notes

- All five tasks complete and all four Acceptance Criteria verified.
- `docker compose up --build` built both multi-stage images without error.
- All three services (postgres, backend, frontend) reached `healthy` status.
- `docker exec … whoami` confirmed both backend and frontend containers run as `node` (not root).

## File List

- `backend/Dockerfile`
- `frontend/Dockerfile`

## Change Log

- 2026-03-03: Refactored both Dockerfiles to multi-stage builds with non-root `node` user and production-only dependency installs (Story 5.1).
