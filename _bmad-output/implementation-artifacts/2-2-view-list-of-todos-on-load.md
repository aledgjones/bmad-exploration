# Story 2.2: View list of todos on load

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see all existing todos immediately when I open the app,
so that I know what tasks are pending.

## Acceptance Criteria

1. Given there are one or more todos in the database,
   When I navigate to the app or refresh the page,
   Then the frontend issues a GET to `/todos` and renders each todo item in the correct state.

## Tasks / Subtasks

- [x] Implement frontend data fetch during page load (AC: 1)
  - [x] Add `TodoList` component under `frontend/app/components` or similar
  - [x] Use existing API client helper (`frontend/src/api/todos.ts`) to request list
  - [x] Render todos with correct styles according to state
- [x] Hook initial page rendering to call GET `/todos` (AC: 1)
  - [x] Update `frontend/app/page.tsx` or container component to fetch on mount
- [x] Write backend route GET `/todos` in `backend/src/routes/todos.ts` (AC: 1)
  - [x] Ensure Prisma model is used to return all todos sorted by creation date
- [x] Add unit tests for frontend component rendering and data loading
- [x] Add unit/integration tests for backend GET `/todos` with empty and non-empty database
- [x] Add e2e Playwright test verifying that todos created via UI appear on load after refresh

## Dev Notes

- Relevant architecture patterns and constraints
  - UI-first design using Next.js app router; keep code in `app/` directory.
  - Reuse `shadcn/ui` components for list layout to maintain consistent, accessible styling.
  - API client in `frontend/src/api/todos.ts` already handles POST; extend it with `getTodos` helper.
  - Backend uses Fastify with TypeScript and Prisma; GET `/todos` should query `prisma.todo.findMany()`.
  - Adhere to accessibility (WCAG 2.1 AA) when rendering list items (aria roles, keyboard focus).
- Source tree components to touch
  - `frontend/app/page.tsx` (or top-level container for todos)
  - `frontend/app/components/TodoList.tsx` (new)
  - `frontend/src/api/todos.ts` (modify)
  - `backend/src/routes/todos.ts` (extend or add GET handler)
  - `backend/test/todos.test.ts` (add GET coverage)
- Testing standards summary
  - Vitest for unit tests; ensure fetch mocking for frontend tests using `msw` or jest.fn.
  - Playwright e2e uses compose-helper; previous enhancements to startup health checks apply.
  - Coverage threshold remains 90%; ensure the new code is covered by tests.

## Developer Context & Guardrails

- Previous story established form handling, API client patterns, and container orchestration fixes.
- Any new component should follow the same import/style conventions (shadcn/ui, Tailwind).
- Ensure that GET requests are cancellable if component unmounts (use `AbortController`).
- Stick to existing folder naming conventions (component files under `app/components` with PascalCase).
- Avoid introducing new state management libraries; use React `useState`/`useEffect` or the existing store if one was added.

## Architecture Compliance

- Must respect the Fastify + Prisma architecture: routes under `src/routes`, use plugin-based Prisma client.
- Data returned by GET `/todos` must match the `Todo` Prisma model and include `id`, `text`, `status`, and `createdAt`.
- Follow performance NFR: queries should use `findMany({ orderBy: { createdAt: 'desc' } })` to limit latency.

## Library/Framework Requirements

- React 18+ with Next.js; Tailwind CSS for styling; shadcn/ui for UI primitives.
- Fastify for backend server; Prisma client v4+ for DB access; zod for request validation if used in POST story.

## File Structure Requirements

- New frontend files should mirror existing structure (e.g. `components/TodoList.tsx`).
- Backend GET handler added alongside POST in `backend/src/routes/todos.ts` to keep all todo routes together.

## Testing Requirements

- Unit test for `TodoList` should render a mock list and ensure correct number of items and statuses.
- Backend tests must cover both empty database behavior (return `[]`) and non-empty listing.
- E2E test should create a few todos via UI (reusing existing creation test) and refresh page to verify persistence.

## Previous Story Intelligence

- The form story solved many scaffolding issues; reuse its component import patterns.
- API client update from 2.1 and tests provide a template for GET and validation logic.
- Build and compose issues resolved previously (health-check retries) will help when writing new e2e tests.

## Git Intelligence Summary

Recent commits show focus on story 2.1 work and fixing e2e setup:

- `a174542 fix: e2e test setup` – improvements to compose-helper and health checks.
- `b4c797e feat: 2-1 code review and components` – added new todo form components.
- `4f54d01 fix: tailwind styles` – styling adjustments, relevant to how list will be styled.
- `625602e fix: cleanup` – general project housekeeping that keeps structure tidy.
- `e897cf5 feat: 2-1 review part 1` – code review adjustments, good examples for quality.

## Latest Tech Information

- No new libraries introduced; rely on versions already specified by architecture document.
- When implementing, check that Prisma client version is current (v4.16 or later) and Tailwind 3.4+.

## Project Context Reference

- This story continues Epic 2 work; nothing in PRD or UX contradicts current approach.

## Story Completion Status

Story scaffold prepared; awaiting developer implementation following the plan above.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
  - Continue monorepo layout with `frontend/`, `backend/`, shared utilities if needed.
  - Use same conventions established in Story 2.1 for components and routes.
- Detected conflicts or variances (with rationale)
  - None expected; data-fetch pattern mirrors POST story.

### References

- Source: `_bmad-output/planning-artifacts/epics.md#story-2.2-view-list-of-todos-on-load`
- Source: `_bmad-output/implementation-artifacts/2-1-add-a-new-todo-item.md` (previous story)

## Dev Agent Record

### Agent Model Used

Raptor mini (Preview)

### Debug Log References

- TODO: populate during implementation.

### Completion Notes List

1. Frontend list component created and integrated with API client.
2. Backend GET `/todos` route implemented with Prisma query and proper ordering.
3. Unit tests added for both frontend and backend; e2e refresh test added.
4. Updated API client helper with `getTodos` method.
5. User later tweaked design: changed page `<main>` background removal and added data-testid; page root background remained grey.
6. Shadcn `card` component regenerated via `npx shadcn@latest add card`, expanding to full set of card subcomponents.
7. Updated unit tests to assert line-through on card wrapper instead of text node due to new card structure.

### File List

```
- frontend/app/components/TodoList.tsx (new)
- frontend/app/page.tsx (modified)
- frontend/src/api/todos.ts (modified)
- backend/src/routes/todos.ts (modified)
- backend/test/todos.test.ts (modified)
- frontend/tests/TodoList.test.tsx (new)
- e2e/playwright-smoke.test.ts (modified)
```
