# Story 2.4: Mark a todo item as complete

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to mark an item complete using the existing status control,
so that I can finish tasks efficiently without extra UI elements.

## Acceptance Criteria

1. Given a todo in To Do or In Progress,
   When I select the "Done" status from the dropdown,
   Then the item moves to the Done section with visual indication,
   And the backend records the completion timestamp.
2. If a todo already in "Done" is later set back to "To Do" or "In Progress",
   Then the completion timestamp is cleared and visual indication is removed.

## Tasks / Subtasks

- [x] Ensure the existing status dropdown can set an item to "Done" (AC: 1)
  - [x] No separate checkbox or swipe control is required
  - [x] Verify accessibility of the dropdown (aria-label, keyboard focus)
- [x] Implement frontend logic to handle the status dropdown change (AC: 1)
  - [x] Use `updateTodoStatus` helper to persist the new status
  - [x] Optimistically update local state and rollback on failure
  - [x] When user moves status away from Done, ensure UI removes completed styling and the backend clears timestamp
- [x] Backend already exposes PATCH `/todos/:id` which handles status changes (AC: 1)
  - [x] Confirm the handler sets `completedAt` when status is 'done'
  - [x] No new endpoint needed
- [x] Add unit tests for UI component behaviour when selecting Done; include error fallback
- [x] Add backend unit tests covering completedAt behavior (setting and clearing), non-existent id, and invalid requests
- [x] Ensure e2e Playwright test covers changing status to Done and persistence

## Dev Notes

- Relevant architecture patterns and constraints
  - Story 2.3 already added status-change logic; completion can reuse the same enum or a dedicated flag.
  - The backend todo model may have a `completedAt` timestamp; if not, add migration (status change to `Done` may suffice).
  - Use the existing Prisma migration scripts (`npx prisma migrate dev` / `deploy`) to modify the schema rather than editing the database manually.
  - Component `TodoItem` should rely on the existing status dropdown; no additional control.
  - Existing optimistic update pattern from Story 2.3 can be reused; consider consolidating completion with status patch if appropriate.
- Source tree components to touch
  - `frontend/app/components/TodoItem.tsx` (modify)
  - `frontend/src/api/todos.ts` (modify)
  - `backend/src/routes/todos.ts` (extend or add new route)
  - `backend/test/todos.test.ts` (extend)
  - `frontend/tests/TodoItem.test.tsx` (extend)
  - `e2e/playwright-smoke.test.ts` (extend)
- Testing standards summary
  - Unit tests should assert visual change to Done style and correct API call.
  - Backend tests should assert timestamp set or status changed to Done.
  - E2E test should mark a new todo complete and reload to verify persistence.

### Project Structure Notes

- Keep consistency with other story files for tasks/subtasks and naming conventions.
- No additional dependencies; reuse existing APIs and patterns.

### References

- Source: `_bmad-output/planning-artifacts/epics.md#story-2.4-mark-a-todo-item-as-complete`
- Previous story file: `_bmad-output/implementation-artifacts/2-3-change-todo-status-among-to-do-in-progress-done.md`

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Added `completedAt` datetime field to Prisma schema with appropriate migration.
- Extended backend PATCH handler to set `completedAt` when status='done', clear it when leaving done, and added tests covering both scenarios.
- Updated `TodoItem` component to leverage the status dropdown only.
- Augmented frontend unit tests for `TodoItem`, `TodoList`, and `Home` page around status-change behavior (including reverting from Done) and color badges.
- Updated e2e Playwright tests to verify setting status to Done, reverting to another status (clearing completed indication), and persistence.
- Ensured all existing tests still pass; no new dependencies introduced.

### File List

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260301115301_add_completed_at/migration.sql`
- `backend/src/routes/todos.ts`
- `backend/test/todos.test.ts`
- `frontend/src/api/todos.ts`
- `frontend/tests/todosApi.test.ts`
- `frontend/tests/page.test.tsx`
- `frontend/app/components/TodoList.tsx` (bug fix: underscore display)
- `frontend/app/page.tsx` (bug fix: reconcile server response)
- `e2e/playwright-smoke.test.ts`
