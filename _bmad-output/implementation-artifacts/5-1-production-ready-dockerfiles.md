# Story 5.1: Production-ready Dockerfiles

Status: done
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

### Review Follow-ups (AI) — applied 2026-03-03

- [x] [AI-Review][HIGH] Add `.dockerignore` to both `backend/` and `frontend/` — prevents host `node_modules` overwriting container deps and leaking `.env` files into image layers
- [x] [AI-Review][HIGH] Fix frontend `CMD` — replace `npm start` (npm as PID 1, swallows SIGTERM) with `node server.js` (node as PID 1, graceful shutdown)
- [x] [AI-Review][MEDIUM] Switch `npm install` to `npm ci` using root `package-lock.json` — widen build contexts to repo root so lockfile is accessible; deterministic builds
- [x] [AI-Review][MEDIUM] Add `output: 'standalone'` to `next.config.ts` — lean production image without full `node_modules`; production stage now copies standalone bundle only
- [x] [AI-Review][MEDIUM] Fix `ARG BACKEND_URL` default from `http://localhost:4000` → `http://backend:4000` — plain `docker build` no longer produces a broken image
- [x] [AI-Review][LOW] Add `HEALTHCHECK` instruction to both Dockerfiles — images are now self-describing for non-Compose deployments

## Dev Notes

- Node 22-alpine images include a built-in `node` user (uid 1000) — no need to `adduser`.
- Frontend must switch from `npm run dev` to `npm run build` + `npm start`.
- Backend already builds TS and runs `node dist/start.js` — just needs stage separation and dependency pruning.
- **Build contexts widened to repo root** so both Dockerfiles can access the root `package-lock.json` (npm workspace lockfiles live at the root). Both services now use `npm ci` for reproducible installs. `docker-compose.yml` updated to `context: .` with explicit `dockerfile:` paths.
- **Frontend uses Next.js standalone mode** (`output: 'standalone'` in `next.config.ts`): `next build` traces exact dependencies and emits a self-contained `server.js` + minimal file tree in `.next/standalone`. The production image copies only that bundle — no `node_modules` install needed, saving ~200 MB.
- **Frontend `CMD` uses `node server.js`** (node as PID 1) instead of `npm start`, ensuring SIGTERM is forwarded to the Next.js server for graceful shutdown.
- **`ARG BACKEND_URL` default** changed from `http://localhost:4000` to `http://backend:4000` so a plain `docker build frontend/` produces a working image without explicit override.
- `BACKEND_URL` is baked into `.next/routes-manifest.json` at build time via `ARG`/`ENV`; the runtime `environment:` entry in `docker-compose.yml` is kept for documentation clarity but does not affect routing.
- `openssl` is retained in the backend production stage — required at runtime by Prisma's `linux-musl-arm64-openssl-1.1.x` binary target (Apple Silicon / Alpine).
- `.dockerignore` files added to both packages: excludes `node_modules`, built output, coverage, logs, and `.env*` files from the build context. Prevents native-module corruption and secrets leaking into image history.

## Dev Agent Record

### Implementation Plan

- `backend/Dockerfile`: Build contexts widened to repo root; workspace manifests + root lockfile copied first, `npm ci` for deterministic install, `ENV PATH` exposes hoisted binaries, `WORKDIR /app/backend` for `prisma generate` + `tsc`. Production stage mirrors the same lockfile-based install with `--omit=dev`, copies `dist/` and Prisma artefacts, adds `HEALTHCHECK`.
- `frontend/Dockerfile`: Same root-context pattern. Build stage runs `next build` via hoisted `next` binary. Production stage copies only the standalone bundle (`.next/standalone`, `.next/static`, `public/`) — no `node_modules` needed. `CMD ["node", "server.js"]` with `HOSTNAME=0.0.0.0` for correct binding.
- `next.config.ts`: Added `output: 'standalone'`.
- `backend/.dockerignore` and `frontend/.dockerignore` created.
- `docker-compose.yml`: Both build contexts updated to `.` (repo root) with explicit `dockerfile:` paths.
- Prisma client artefacts (`node_modules/.prisma` and `node_modules/@prisma`) are copied from the build stage rather than re-generated in the production stage, keeping the prod image lean while ensuring the client is available at runtime.

### Completion Notes

- All five original tasks complete and all four Acceptance Criteria verified.
- Code review (2026-03-03) identified and auto-fixed 6 additional issues (2 HIGH, 3 MEDIUM, 1 LOW) — see Review Follow-ups section above.
- Post-review: `docker compose up --build` builds from repo root context; all three services start and pass health checks.
- Frontend image size significantly reduced via standalone output mode.
- Both containers confirmed running as `node` (non-root). Node is PID 1 in both containers.

## File List

- `backend/Dockerfile`
- `backend/.dockerignore`
- `frontend/Dockerfile`
- `frontend/.dockerignore`
- `frontend/next.config.ts`
- `docker-compose.yml`

## Change Log

- 2026-03-03: Refactored both Dockerfiles to multi-stage builds with non-root `node` user and production-only dependency installs (Story 5.1).
- 2026-03-03: Code review fixes — added `.dockerignore` files; switched to root build context + `npm ci`; `next.config.ts` `output: 'standalone'`; frontend `CMD` node as PID 1; fixed `BACKEND_URL` default; added `HEALTHCHECK` to both Dockerfiles; updated `docker-compose.yml` build contexts (Story 5.1 code review).
