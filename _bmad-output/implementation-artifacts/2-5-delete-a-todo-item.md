# Story 2.5: Delete a todo item

Status: done

## Story

As a user,
I want to remove a todo from the list,
so that I can discard irrelevant tasks.

## Acceptance Criteria

1. Given a todo is visible,
   When I click the delete button and confirm,
   Then the item disappears from the UI,
   And a DELETE request is sent to `/todos/:id` and the backend returns success.
2. Given I click a delete button and then cancel the confirmation,
   Then the item remains in the list unchanged and no request is sent.
3. Given a DELETE request fails (network error or server error),
   Then the item is restored to the list and an error message is shown.

## Tasks / Subtasks

- [x] Add backend DELETE `/todos/:id` endpoint (AC: 1)
  - [x] Add route with schema validation for `id` param (string, parsed to number)
  - [x] Return 204 on success
  - [x] Return 404 with `{ error: 'todo not found' }` for missing id (Prisma P2025)
  - [x] Return 400 with `{ error: 'invalid id' }` for non-numeric id
  - [x] Return 500 with `{ error: 'database not initialized' }` when prisma is null
- [x] Add `deleteTodo(id: number)` to frontend API client (AC: 1)
  - [x] Send DELETE to `/todos/${id}`
  - [x] Throw on non-ok response with error detail
- [x] Add delete button to `TodoItem` component (AC: 1, 2)
  - [x] Render a delete/trash icon button with `aria-label="Delete todo"`
  - [x] On click, show `window.confirm()` dialog; proceed only on confirm
  - [x] Call `onDelete(id)` prop when confirmed
- [x] Add `handleDelete` to `page.tsx` with optimistic removal and rollback (AC: 1, 3)
  - [x] Optimistically remove item from state
  - [x] Call `deleteTodo(id)` API
  - [x] On failure: restore item to previous position in list, show `alert()` error
- [x] Pass `onDelete` prop through `TodoList` to `TodoItem` (AC: 1)
- [x] Add backend unit tests for DELETE endpoint (AC: 1)
  - [x] Test successful deletion returns 204
  - [x] Test deletion of non-existent id returns 404
  - [x] Test non-numeric id returns 400
  - [x] Test prisma-null returns 500
- [x] Add frontend unit tests (AC: 1, 2, 3)
  - [x] Test `deleteTodo` API client (success, failure)
  - [x] Test `TodoItem` renders delete button and calls `onDelete` on confirm
  - [x] Test `TodoItem` does NOT call `onDelete` when confirm is cancelled
  - [x] Test `Home` page optimistic delete and rollback on failure
- [x] Add e2e Playwright test for delete flow (AC: 1)
  - [x] Create a todo, delete it, verify it disappears
  - [x] Reload page and verify it remains deleted

## Dev Notes

### Backend Implementation

- **Route location**: [backend/src/routes/todos.ts](backend/src/routes/todos.ts) — add a `fastify.delete('/todos/:id', ...)` handler following the exact same pattern as the existing PATCH handler.
- **Schema**: Reuse the same `params` schema pattern from PATCH (`id` as string, parsed to number with `Number(id)` and `Number.isNaN` guard).
- **Prisma call**: `fastify.prisma.todo.delete({ where: { id: idNum } })` — catch `P2025` for not-found, rethrow others.
- **Response**: Return `reply.code(204).send()` on success (no body). This follows REST conventions for delete.
- **Null-prisma guard**: Same pattern as POST/GET/PATCH — return `reply.code(500).send({ error: 'database not initialized' })`.

### Frontend API Client

- **File**: [frontend/src/api/todos.ts](frontend/src/api/todos.ts) — add `deleteTodo` export below the existing `updateTodoStatus` function.
- **Pattern**: Follow the same error-handling pattern as `createTodo` and `updateTodoStatus` — check `res.ok`, parse error JSON, throw `Error` with status and optional server message.
- **No return value needed** — void/Promise<void> since 204 has no body. If the backend returns the deleted object, you may ignore it.

### Frontend UI

- **TodoItem** ([frontend/app/components/TodoItem.tsx](frontend/app/components/TodoItem.tsx)):
  - Add a new prop `onDelete: (id: number) => void` to `TodoItemProps`.
  - Add a button (e.g. `<button aria-label="Delete todo" ...>`) with a trash/X icon or text "×".
  - On click: `if (window.confirm('Delete this todo?')) onDelete(todo.id)`.
  - Position the button to the right of the status dropdown, inside the existing `CardContent` flex container.
- **TodoList** ([frontend/app/components/TodoList.tsx](frontend/app/components/TodoList.tsx)):
  - Add `onDelete: (id: number) => void` to `TodoListProps`.
  - Pass `onDelete` through to each `<TodoItem>`.

- **Page** ([frontend/app/page.tsx](frontend/app/page.tsx)):
  - Import `deleteTodo` from API client.
  - Add `handleDelete` async function following the same optimistic pattern as `handleStatusChange`:
    1. Save previous todos state.
    2. Optimistically filter out the deleted item: `setTodos(prev => prev.filter(t => t.id !== id))`.
    3. Call `await deleteTodo(id)`.
    4. On catch: restore previous state via `setTodos(previousTodos)`, show `alert('Unable to delete todo')`.
  - Pass `onDelete={handleDelete}` to `<TodoList>`.

### Testing Strategy

- **Backend tests** ([backend/test/todos.test.ts](backend/test/todos.test.ts)):
  - Follow the established pattern: create a Fastify instance, register app, use `server.inject()`.
  - Test `DELETE /todos/:id` returns 204 and the item no longer exists in DB.
  - Test 404 for non-existent id, 400 for non-numeric id.
  - Add prisma-null test in the existing "routes return 500 if prisma not initialized" test (add a DELETE inject).
  - Add to the direct handler invocation test: exercise delete handler paths.

- **Frontend API tests** ([frontend/tests/todosApi.test.ts](frontend/tests/todosApi.test.ts)):
  - Add tests for `deleteTodo`: success (204), failure (non-ok response).
  - Mock `global.fetch` as established.

- **Frontend component tests**:
  - [frontend/tests/Home.test.tsx](frontend/tests/Home.test.tsx) or [frontend/tests/page.test.tsx](frontend/tests/page.test.tsx) — test optimistic delete and rollback.
  - Test that `TodoItem` renders delete button and calls handler appropriately.
  - Mock `window.confirm` to test both confirm and cancel paths.

- **E2E test** ([e2e/playwright-smoke.test.ts](e2e/playwright-smoke.test.ts)):
  - Create a todo, click delete button, accept confirmation, verify item disappears.
  - Reload page and verify item stays deleted.

### Anti-Patterns to Avoid

- Do NOT add a separate delete confirmation modal/dialog component — use `window.confirm()` for simplicity per current UI patterns.
- Do NOT return 200 with body from DELETE — use 204 No Content.
- Do NOT forget to add the delete button's `aria-label` for accessibility.
- Do NOT create a new route file — extend the existing [backend/src/routes/todos.ts](backend/src/routes/todos.ts).
- Do NOT skip the optimistic update pattern — it's established across Stories 2.1–2.4 and required by FR11.

### Project Structure Notes

- All changes are within existing files; no new files needed except possibly no new files at all.
- Backend route file: [backend/src/routes/todos.ts](backend/src/routes/todos.ts)
- Frontend API: [frontend/src/api/todos.ts](frontend/src/api/todos.ts)
- Components: [frontend/app/components/TodoItem.tsx](frontend/app/components/TodoItem.tsx), [frontend/app/components/TodoList.tsx](frontend/app/components/TodoList.tsx)
- Page: [frontend/app/page.tsx](frontend/app/page.tsx)
- Tests: [backend/test/todos.test.ts](backend/test/todos.test.ts), [frontend/tests/todosApi.test.ts](frontend/tests/todosApi.test.ts), [e2e/playwright-smoke.test.ts](e2e/playwright-smoke.test.ts)

### References

- [Source: \_bmad-output/planning-artifacts/epics.md#Story 2.5: Delete a todo item](epics.md)
- [Source: \_bmad-output/planning-artifacts/architecture.md#API & Communication](architecture.md)
- [Source: \_bmad-output/implementation-artifacts/2-4-mark-a-todo-item-as-complete.md](2-4-mark-a-todo-item-as-complete.md)
- FR5: A user can delete a todo item.
- FR11: User interactions (create/update/delete) are reflected instantly without a page reload.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (GitHub Copilot)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Backend: Added `DELETE /todos/:id` handler in `backend/src/routes/todos.ts` following the exact PATCH handler pattern — schema validation, numeric id parsing, prisma-null guard, P2025 catch for 404, 204 No Content on success.
- Frontend API: Added `deleteTodo(id)` in `frontend/src/api/todos.ts` — sends DELETE, throws with status+error detail on failure, returns void.
- TodoItem: Added `onDelete` prop and "×" button with `aria-label="Delete todo"`. On click, shows `window.confirm('Delete this todo?')` — only calls `onDelete(todo.id)` when confirmed.
- TodoList: Added `onDelete` prop passthrough to each `<TodoItem>`.
- Page: Added `handleDelete` with optimistic removal (filter from state) and rollback on failure (restore previous state + alert).
- Backend tests: 3 integration tests (204 success, 404 not-found, 400 non-numeric) + prisma-null guard in existing 500 test + direct handler invocation for success/P2025/generic-error/invalid-id paths.
- Frontend tests: 3 `deleteTodo` API client tests (success, error with json, error without json), 3 TodoItem tests (renders button, confirm→calls onDelete, cancel→no call), 3 page tests (optimistic delete, rollback on failure, cancel does nothing).
- E2E: Added Playwright test that creates a todo, deletes it (accepts dialog), verifies removal, reloads, and confirms persistence.
- All 50 unit tests pass (22 backend + 28 frontend). Zero regressions.

### Change Log

- 2026-03-01: Implemented Story 2.5 — Delete a todo item (all ACs satisfied)
- 2026-03-01: Code Review fixes — H1: fixed stale closure in handleDelete rollback; H2: replaced flaky waitForTimeout with deterministic waitForFunction in e2e; M1: added sprint-status.yaml to File List; M2: added logging to DELETE handler

### File List

- backend/src/routes/todos.ts (modified — added DELETE endpoint)
- frontend/src/api/todos.ts (modified — added deleteTodo function)
- frontend/app/components/TodoItem.tsx (modified — added onDelete prop and delete button)
- frontend/app/components/TodoList.tsx (modified — added onDelete prop passthrough)
- frontend/app/page.tsx (modified — added handleDelete with optimistic removal)
- backend/test/todos.test.ts (modified — added DELETE endpoint tests)
- frontend/tests/todosApi.test.ts (modified — added deleteTodo API tests)
- frontend/tests/TodoItem.test.tsx (modified — added delete button tests)
- frontend/tests/TodoList.test.tsx (modified — added onDelete prop)
- frontend/tests/page.test.tsx (modified — added optimistic delete/rollback tests)
- frontend/tests/Home.test.tsx (modified — added deleteTodo mock)
- e2e/playwright-smoke.test.ts (modified — added delete flow e2e test)
- \_bmad-output/implementation-artifacts/sprint-status.yaml (modified — updated story status)
