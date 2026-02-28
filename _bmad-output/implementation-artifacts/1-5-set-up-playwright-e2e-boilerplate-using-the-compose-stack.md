# Story 1.5: Set up Playwright e2e boilerplate using the compose stack

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a QA engineer,
I want Playwright tests configured to spin up `docker-compose` and run a smoke test against the running frontend,
so that I can verify the stack launches and a basic UI flow works end-to-end.

## Acceptance Criteria

1. [Add acceptance criteria from epics/PRD]
   - Given the monorepo root with compose stack,
   - When I run `npm run test:e2e` from the root,
   - Then Playwright brings up containers, navigates to the frontend, and confirms the homepage loads,
   - And the test passes and cleans up the containers.

## Tasks / Subtasks

- [x] Ensure `docker-compose.yml` brings up frontend, backend, and postgres
  - [x] Verify the backend responds at the expected hostname/port (covered by e2e script and smoke test located under `e2e`)
- [x] Add Playwright configuration (playwright.config.ts) to the repo
  - [x] Use `@playwright/test` default generator and adjust baseURL to compose stack
- [x] Implement a simple smoke test (e.g. `playwright-smoke.test.ts`) that loads the home page and lives in dedicated top‑level `e2e` folder
- [x] Add npm script `test:e2e` that starts compose and runs Playwright

### Review Follow-ups (AI)

- [x] [AI-Review][Medium] Document `backend/package.json` and `backend/test/playwright-smoke.test.ts` changes in story file to match git commits.
- [x] [AI-Review][Medium] Remove or clarify duplicate smoke test in `backend/test/playwright-smoke.test.ts` since active test now lives in `/e2e`.

## Dev Notes

- Relevant architecture patterns and constraints:
  - The e2e suite must interact with the full stack (frontend, backend, postgres) via Docker Compose.
  - The smoke test now programmatically brings up and tears down the stack using a shared helper (`e2e/compose-helper.ts`) inside `beforeAll`/`afterAll` hooks.
  - Tests will run inside the developer’s local environment; avoid external dependencies.
- Source tree components to touch:
  - `docker-compose.yml` at project root
  - `e2e/playwright-smoke.test.ts` (existing)
  - Add `frontend/tests` or similar if needed later
  - `package.json` root scripts
- Testing standards summary:
  - Use Vitest for unit/CI tests and Playwright for e2e.
  - Ensure compose is shut down regardless of test result (`--exit` flags or teardown hooks).

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
- Detected conflicts or variances (with rationale)

### References

- Cite all technical details with source paths and sections, e.g. [Source: docs/<file>.md#Section]
- Existing smoke test file: `e2e/playwright-smoke.test.ts`

## Dev Agent Record

- created dedicated e2e directory at repository root (`/e2e`)
- moved smoke test and compose helper into root `e2e`, and modified the smoke test to start/stop the compose stack itself via the helper using beforeAll/afterAll hooks
- removed obsolete `backend/test/playwright-smoke.test.ts` after migrating it to `/e2e` (old file duplicated behavior)
- adjusted `backend/vitest.config.ts` to limit test discovery to unit files; e2e tests are now invoked explicitly
- updated `playwright.config.ts` to point at root `e2e`
- added root npm script `test:e2e` which brings up compose, installs
  browsers, runs the smoke test and tears the stack down
- verified e2e flow locally; smoke test passes and containers clean up

### Agent Model Used

{{agent_model_name_version}}

### Updated File List

- `backend/package.json` (added Playwright & testcontainers deps)
- `e2e/playwright-smoke.test.ts` (active smoke test)
- `e2e/compose-helper.ts` (stack helper)
- `playwright.config.ts` (new config)
- `package.json` (root script addition)
- `backend/vitest.config.ts` (test discovery update)

### Debug Log References

- Git commit 84e9b78 shows backend/package.json and backend/test/playwright-smoke.test.ts modifications.

- terminal output from running `npm run test:e2e` (success)

### Completion Notes List

1. Playwright configuration file added for future tests with testDir aimed
   at `./e2e`.
2. E2E tests now reside in their own top‑level `e2e` folder.
3. Backend Vitest config updated to limit to unit tests only; e2e tests invoked directly.
4. E2E script updated to reference new path; tests now manage compose lifecycle themselves with beforeAll/afterAll hooks.
5. No test failures remain; full suite still passes (run separately).

- `playwright.config.ts` (new)
- `package.json` (root) – added `test:e2e` script
- `e2e/playwright-smoke.test.ts` – unskipped & simplified
- `e2e/compose-helper.ts` (helper relocated)
- `backend/vitest.config.ts` – updated to include/exclude root `e2e` path
- `docker-compose.yml` (existing, verified)

```

```
