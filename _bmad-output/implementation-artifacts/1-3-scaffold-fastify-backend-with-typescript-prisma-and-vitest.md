# Story 1.3: scaffold-fastify-backend-with-typescript-prisma-and-vitest

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend developer,
I want a Fastify project initialized with TypeScript, Prisma setup for Postgres, and Vitest configured,
so that I can begin implementing API endpoints with a database abstraction and tests.

## Acceptance Criteria

1. Given the monorepo root, when I initialize the backend with `npm init fastify@latest -- --lang=ts` and add Prisma and Vitest,
   then `backend/` contains a working Fastify project.
2. And running `npm run dev` in `backend/` starts the server.
3. And a sample Prisma model is defined with `npx prisma migrate dev` running successfully.
4. And backend tests run via Vitest with a basic smoke test passing.

## Tasks / Subtasks

- [x] Initialize backend folder with Fastify TypeScript template (use `npm init fastify@latest -- --lang=ts`).
  - [x] Ensure `tsconfig.json`, `package.json`, and basic Fastify server files are present.
- [x] Add Prisma to backend dependencies and configure for PostgreSQL.
  - [x] Create `prisma/schema.prisma` with a simple `Todo` model (id, text, status, createdAt, updatedAt).
  - [x] Run `npx prisma migrate dev` to generate SQLite/Postgres migration (choose Postgres).
- [x] Install and configure Vitest for backend project.
  - [x] Add sample test verifying server startup or Prisma connection.
- [x] Verify backend `npm run dev` starts without errors (port conflict resolved separately).
- [x] Document commands in README/backend or root docs.

## Dev Notes

- Relevant architecture patterns and constraints:
  - Backend is Fastify with TypeScript; follow repository structure consistent with frontend.
  - Use Prisma as ORM targeting PostgreSQL; database URL should be configurable via env var.
  - Testing standard: Vitest for unit tests; mimic config used in frontend to share patterns.
- Source tree components to touch:
  - `backend/src/` for server code.
  - `backend/prisma/` for schema and migrations.
  - `backend/package.json` and tsconfig for scripts and build.
  - Root `docker-compose.yml` to include backend service.
- Testing approaches: initial smoke test connecting to Prisma; later e2e via Playwright in story 1.5.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming):
  - Keep backend code under `backend/` and use `src/` directory.
  - Use `shared/` modules if any common code emerges.
- Detected conflicts or variances (with rationale):
  - None identified yet; ensure TypeScript versions match frontend.

---

**Review fixes applied:**

- Removed unused `support` plugin and its README (no longer autoloaded).
- Adjusted Vitest config to target only `backend/test/**/*.ts` to avoid duplicate runs.
- Added explicit PORT handling in `app.ts` for clarity.
- Updated documentation to reflect plugin cleanup and test changes.
- Story File List expanded to include every file actually created/modified (see below).

### References

- Source: `_bmad-output/planning-artifacts/epics.md#Story-1.3:`, installation steps for Fastify.
- Source: `architecture.md` may contain backend tech stack; check for specifics.

## Dev Agent Record

### Agent Model Used

Raptor mini (Preview)

### Debug Log References

- Terminal outputs show successful scaffold, prisma migration, and test runs.

### Completion Notes List

- Backend folder scaffolded and existing placeholder `package.json` replaced.
- Prisma v4 added and configured; migration executed against local Postgres container.
- Vitest installed and configured; legacy Fastify CLI tests removed and new smoke tests added.
- ESM compatibility issues addressed (`__dirname`, import style, package.json `type: module`).
- Docker resources added (`docker-compose.yml`, `Dockerfile`) for local development.
- Documentation updated in both root and backend READMEs.
- All acceptance criteria satisfied; tests passing 100%.
- Post-review cleanup:
  - Removed unused `support` plugin and its README.
  - Adjusted Vitest config to avoid duplicate compiled/source test runs.
  - Added explicit PORT handling code.

### File List

- backend/package.json
- backend/tsconfig.json
- backend/vitest.config.ts
- backend/test/smoke.test.ts
- backend/prisma/schema.prisma
- backend/Dockerfile
- docker-compose.yml
- README.md (root update)
- backend/README.md
- backend/src/app.ts
- backend/src/plugins/sensible.ts
- backend/src/routes/root.ts
- backend/src/routes/example/index.ts
- backend/.gitignore
- backend/prisma/migrations/20260227231814_init/migration.sql
- backend/prisma/migrations/migration_lock.toml
- backend/src/plugins/README.md (removed)
- backend/src/plugins/support.ts (removed)
- backend/src/routes/README.md
- backend/test/helper.ts
- backend/test/tsconfig.json
- package-lock.json

---

## Developer Context

### Technical Requirements

- Create new Fastify project using TypeScript template.
- Integrate Prisma for PostgreSQL with migration support.
- Configure Vitest for backend unit tests.
- Environment variables: `DATABASE_URL`, `PORT`, etc. should be used and documented.
- Server startup script (`npm run dev`) must compile TS and launch Fastify.

### Architecture Compliance

- Follow architectural decisions specified in `architecture.md`:
  - Services are containerized; backend will run in its own Docker container defined in `docker-compose.yml`.
  - Use PostgreSQL as the primary database; Prisma schema must reflect normalized Todo entity with appropriate indexes.
  - Adhere to security requirements (HTTPS, input validation) even at scaffold stage.

### Library/Framework Requirements

- Fastify latest stable (v4+); use TypeScript typings.
- Prisma latest stable (v4+) with Postgres connector.
- Vitest for testing; match versions used by frontend to avoid conflicts.
- Node 18+ runtime as assumed by other stories.

### File Structure Requirements

- `backend/` root containing:
  - `src/` with `server.ts` as entrypoint.
  - `prisma/` with `schema.prisma` and generated client.
  - `tests/` or `__tests__/` for Vitest tests.
- Ensure `backend/package.json` scripts include `dev`, `build`, `test`.
- Update root `tsconfig.json` or create `tsconfig.backend.json` if needed to share configuration.

### Testing Requirements

- Vitest configured with TypeScript support and source maps.
- Provide a smoke test that instantiates Fastify app and checks route `/` or Prisma connection.
- Future stories will add more comprehensive unit and e2e tests; structure files accordingly.

### Previous Story Intelligence

The previous story (1.2) set up the Next.js frontend with TypeScript, Tailwind, ESLint, and Vitest. Key learnings:

- Monorepo structure has `frontend/` and shared config files; replicate patterns for `backend/`.
- Setup of Vitest on frontend included `vitest.setup.ts`; backend may reuse similar utilities if needed.
- The frontend scaffold had ESLint and TypeScript strict settings; ensure backend linting aligns (possibly using `eslint --ext ts` config).
- No direct code dependencies yet; backend will eventually serve data to frontend, so keep API design in mind.

### Git Intelligence Summary

Recent commits indicate initial project scaffolding and frontend setup. No backend code exists yet.

- Commits:
  - "chore: scaffold Next.js frontend with TypeScript, Tailwind, ESLint, Vitest"
  - "chore: initialize monorepo structure"
  - "docs: add README with project layout"
  - ... (backend related patterns not yet present)

No library additions relevant to backend yet. Observe commit patterns (feature-branch naming) when creating backend work.

### Latest Technical Information

- Fastify v4 changed plugin registration syntax (`fastify.register(import('...'))`). Verify in docs.
- Prisma 4+ supports `client.$connect()` and `migrate dev`; ensure Postgres connector is updated.
- Node 18 is LTS; ensure compatibility. Use ES modules or commonjs consistently (frontend uses ESM). Decide on module type.
- Vitest releases: at time of writing v0.34+; check for any breaking changes with TypeScript or node test environment.

### Project Context Reference

The overall project aims to deliver a full-stack todo application with containerized services, robust testing, and performance/accessibility targets. This story provides the backend foundation aligning with previous frontend work and upcoming UI/UX requirements.

### Story Completion Status

Context document generated and ready for developer implementation. Stored at `{story_file}` with status set to ready-for-dev.

---
