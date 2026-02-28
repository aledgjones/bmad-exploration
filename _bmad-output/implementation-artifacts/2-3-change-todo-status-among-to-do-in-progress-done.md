# Story 2.3: Change todo status among To Do, In Progress, Done

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to move a todo between the three states using drag/drop or buttons,
so that I can indicate progress.

## Acceptance Criteria

1. Given a todo is displayed in one state,
   When I interact with the control to change its status,
   Then the UI updates immediately to the new state,
   And a PATCH request is sent to `/todos/:id` with the new status.

## Tasks / Subtasks

- [x] Design or reuse UI control on each todo item for state changes (AC: 1)
  - [x] Add buttons or drag handles in `frontend/app/components/TodoItem.tsx` or similar
  - [x] Ensure accessible keyboard controls for state changes
- [x] Implement frontend logic to call API client `updateTodoStatus(id, status)` (AC: 1)
  - [x] Extend `frontend/src/api/todos.ts` with a patch helper
  - [x] Optimistically update local state when user interacts
- [x] Create or extend backend route PATCH `/todos/:id` (AC: 1)
  - [x] Validate incoming status value (`To Do` | `In Progress` | `Done`)
  - [x] Use Prisma to update `status` field and return updated object
- [x] Add unit tests for UI component behaviour and status change logic
- [x] Add backend unit tests for PATCH endpoint, including invalid status and non-existent id
- [x] Add e2e Playwright test verifying status change persists and UI updates

## Dev Notes

- Relevant architecture patterns and constraints
  - Existing `TodoList` and creation logic from Story 2.2 provide the baseline for rendering items.
  - Follow the same data-fetch and state conventions (React `useState`/`useEffect`, local cache); avoid introducing Redux.
  - Backend already has POST and GET handlers; the new PATCH handler should live alongside them in `backend/src/routes/todos.ts`.
  - Status values should be stored as enum in Prisma model if not already; verify `schema.prisma`.
  - Accessibility: buttons for changing status need ARIA labels describing the target state.
- Source tree components to touch
  - `frontend/app/components/TodoList.tsx` (maybe pass handlers to items)
  - `frontend/app/components/TodoItem.tsx` (new or modified)
  - `frontend/src/api/todos.ts` (modify)
  - `backend/src/routes/todos.ts` (add PATCH route)
  - `backend/test/todos.test.ts` (extend)
  - `frontend/tests/TodoItem.test.tsx` (new)
  - e2e/playwright-smoke.test.ts (extend with status-change scenario)
- Testing standards summary
  - Ensure optimistic UI update is covered and rollback on failure tested.
  - Backend tests should simulate database state using Prisma test utils.
- UX Notes
  - Users should be able to change status via click; drag-and-drop is optional but give descriptive tick or arrow buttons.
  - Visual feedback (e.g., spinner on item) while update is in-flight.

## Developer Context & Guardrails

- Previous stories (2.1, 2.2) established form handling, list rendering, and API client patterns; reuse those.
- Keep styling consistent with `shadcn/ui` card components and Tailwind conventions.
- Avoid adding new dependencies unless absolutely necessary (drag/drop libs not required for initial implementation).

## Architecture Compliance

- Follow Fastify plugin pattern in backend; the PATCH route should use schema validation when available.
- Prisma update should use `prisma.todo.update({ where:{ id }, data:{ status } })` and order in response not relevant.
- Maintain latencies under 100 ms; status updates should be lightweight.

## Library/Framework Requirements

- Continue using React 18+ with Next.js, Tailwind CSS, shadcn/ui.
- Fastify, Prisma v4+, zod for validation if already used in POST handler.

## File Structure Requirements

- Add or modify frontend components under `app/components`.
- Keep todos routes grouped in `backend/src/routes/todos.ts`.

## Testing Requirements

- Unit test for `TodoItem` must assert that clicking control changes status and calls API client with correct arguments.
- Backend tests for PATCH should verify 200 on valid status and 400/404 for invalid cases.
- E2E test should create a todo, change its status to In Progress and Done, and verify persistence after refresh.

## Previous Story Intelligence

- Story 2.2 introduced `TodoList` and API client helpers; extend rather than duplicate.
- The POST handler and tests provide a template for schema validation and error handling.
- Look at Git commits around `a174542` et al. for e2e patterns when extending tests.

## Git Intelligence Summary

- Recent commits show familiarity with Playwright setup and health checks; reuse `compose-helper` patterns.

## Latest Tech Information

- Ensure Prisma enum for status includes the three required states; migration may be needed.

## Project Context Reference

- This story is part of Epic 2 and directly implements FR3.

## Story Completion Status

Scaffold created; now ready for developer execution. Once implemented, mark `Status:` to `review` and run tests.

## Dev Agent Record

### Implementation Plan

- Added `TodoItem` component with badge‑style status dropdown (`<select>`) and ARIA label for accessibility.
- Each status option is coloured differently (gray/yellow/green) via `badgeColor` helper.
- Extended API client (`todos.ts`) with `updateTodoStatus` helper and status type.
- Modified `page.tsx` to handle optimistic UI updates and call backend, with debug logs.
- Added PATCH `/todos/:id` route in backend with validation, Prisma update and logging.
- Updated Next.js rewrites (`next.config.ts`) to proxy `/todos/:path*` to backend.
- Created new unit tests for `TodoItem`, API client, and extended existing `TodoList` test.
- Added backend tests for PATCH (valid, invalid, missing id) and enhanced e2e flow.
- Added console/logging to aid debugging and ensure e2e visibility.

### Completion Notes

- All defined tasks have been implemented and verified via unit/e2e tests.
- UI uses dropdown badges rather than buttons; keyboard and screen-reader users can interact.
- Optimistic updates occur and rollback on failure; network errors are handled.
- Status persists across page reloads, confirmed by both UI and server state.
- No additional dependencies were introduced; existing patterns reused.
- Backend logs now record patch operations for future troubleshooting.

## File List

- `frontend/app/components/TodoItem.tsx` (new)
- `frontend/app/components/TodoList.tsx` (modified)
- `frontend/app/page.tsx` (modified)
- `frontend/src/api/todos.ts` (modified)
- `frontend/tests/TodoItem.test.tsx` (new)
- `frontend/tests/todosApi.test.ts` (new)
- `frontend/tests/TodoList.test.tsx` (modified)
- `e2e/playwright-smoke.test.ts` (modified)
- `backend/src/routes/todos.ts` (modified)
- `backend/test/todos.test.ts` (modified)
- `frontend/next.config.ts` (modified)

## Change Log

- Added PATCH status update support and UI controls.
- Improved Next.js rewrites to proxy nested `/todos` routes.
- Added comprehensive tests covering UI, backend, and e2e flows.
- Introduced logging in backend and frontend for debugging.

## Status: review

### References

- Source: `_bmad-output/planning-artifacts/epics.md#story-2.3-change-todo-status-among-to-do-in-progress-done`
- Previous story file: `_bmad-output/implementation-artifacts/2-2-view-list-of-todos-on-load.md`
