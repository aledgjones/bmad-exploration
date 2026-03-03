# Story 3.2: Auto-save changes to prevent data loss

Status: review

## Story

As a user,
I want my edits and status changes to be automatically persisted,
so that a crash or network glitch doesn't lose work.

## Acceptance Criteria

1. **Given** I modify a todo (create, edit, status change),
   **When** the action completes in the UI,
   **Then** a corresponding request is sent to the backend,
   **And** refreshing immediately afterwards shows the updated state.

2. **Given** I delete a todo,
   **When** the deletion is confirmed in the UI,
   **Then** a DELETE request is sent to the backend,
   **And** refreshing does not bring the todo back.

## Tasks / Subtasks

- [x] Audit all mutation handlers in `frontend/app/page.tsx` to confirm each sends a backend request (AC: 1, 2)
  - [x] `handleAdd`: calls `createTodo(text)` → `POST /todos` ✓ (verify persists to DB)
  - [x] `handleStatusChange`: calls `updateTodoStatus(id, status)` → `PATCH /todos/:id` with `{ status }` ✓
  - [x] `handleEdit`: calls `updateTodoText(id, text)` → `PATCH /todos/:id` with `{ text }` ✓
  - [x] `handleDelete`: calls `deleteTodo(id)` → `DELETE /todos/:id` ✓
  - [x] Confirm each function in `frontend/src/api/todos.ts` sends the correct HTTP method and payload
- [x] Verify backend PATCH route persists `text` and `status` changes to PostgreSQL (AC: 1)
  - [x] Confirm `PATCH /todos/:id` with `{ status }` updates `status` (and `completedAt` when `done`)
  - [x] Confirm `PATCH /todos/:id` with `{ text }` updates `text`
  - [x] Confirm `anyOf: [{ required: ['status'] }, { required: ['text'] }]` validation is in place
- [x] Verify backend DELETE route removes the record from PostgreSQL (AC: 2)
  - [x] Confirm `DELETE /todos/:id` calls `prisma.todo.delete({ where: { id } })`
  - [x] Confirm 404 is returned when attempting to delete a non-existent todo (P2025 error code)
- [x] Add frontend integration tests to confirm mutations hit the API (AC: 1, 2)
  - [x] `frontend/tests/page.test.tsx`: after `handleStatusChange`, assert `updateTodoStatus` was called with correct args
  - [x] `frontend/tests/page.test.tsx`: after `handleEdit`, assert `updateTodoText` was called with correct args
  - [x] `frontend/tests/page.test.tsx`: after `handleDelete`, assert `deleteTodo` was called with correct id
- [x] Add/extend backend integration tests covering update and delete persistence (AC: 1, 2)
  - [x] `backend/test/todos.test.ts`: PATCH status then GET — assert updated status in list
  - [x] `backend/test/todos.test.ts`: PATCH text then GET — assert updated text in list
  - [x] `backend/test/todos.test.ts`: DELETE then GET — assert todo no longer in list
  - [x] `backend/test/todos.test.ts`: Confirm `completedAt` is set when status changes to `done`
  - [x] `backend/test/todos.test.ts`: Confirm `completedAt` is cleared when status changes away from `done`
- [x] Add e2e tests proving mutations persist after reload (AC: 1, 2)
  - [x] Create todo → change status → reload → assert updated status visible
  - [x] Create todo → edit text → reload → assert new text visible
  - [x] Create todo → delete → reload → assert todo absent
- [x] Validate 90% coverage threshold is maintained

## Dev Notes

### What Already Exists — Primarily a Verification Story

All mutation logic is **already implemented** across Epics 1 and 2. This story's job is to **verify** each mutation round-trips to the database and add tests proving it.

**Frontend mutation handlers** (in `frontend/app/page.tsx`):

| Handler              | API fn                         | HTTP   | Route        |
| -------------------- | ------------------------------ | ------ | ------------ |
| `handleAdd`          | `createTodo(text)`             | POST   | `/todos`     |
| `handleStatusChange` | `updateTodoStatus(id, status)` | PATCH  | `/todos/:id` |
| `handleEdit`         | `updateTodoText(id, text)`     | PATCH  | `/todos/:id` |
| `handleDelete`       | `deleteTodo(id)`               | DELETE | `/todos/:id` |

All handlers already use **optimistic updates with rollback** (implemented in Story 2-11). This means the UI updates immediately and rolls back on API failure.

**Backend route** (`backend/src/routes/todos.ts`):

- `POST /todos` → `prisma.todo.create({ data: { text, status: 'todo' } })`
- `GET /todos` → `prisma.todo.findMany({ orderBy: { createdAt: 'desc' } })`
- `PATCH /todos/:id` → `prisma.todo.update({ where: { id }, data: { status?, text?, completedAt? } })`
- `DELETE /todos/:id` → `prisma.todo.delete({ where: { id } })`

The PATCH handler specifically manages `completedAt`:

- `status === 'done'` → `completedAt = new Date()`
- `status !== 'done'` → `completedAt = null`

### Critical Architecture Requirements

**Do NOT**:

- Add debounce/auto-save timers — mutations are sent immediately on user action (not on a timer)
- Create a background sync or service worker — out of scope
- Change from optimistic updates to loading-before-update — this breaks the UX established in Story 2-11
- Use localStorage/IndexedDB for persistence — backend PostgreSQL is the persistence layer
- Add a separate "save" button — all changes are sent immediately on user action

**Backend stack** (do NOT deviate):

- **Fastify** (NOT Express)
- **Prisma** with PostgreSQL (NOT raw SQL)
- **TypeScript** — all new files must be `.ts`
- **Vitest** for backend and frontend unit/integration tests

**File locations** (do NOT create new files unless absolutely necessary):

- Frontend mutations: `frontend/app/page.tsx` (ALL handlers already exist here)
- Frontend API functions: `frontend/src/api/todos.ts` (all functions already exist)
- Backend route: `backend/src/routes/todos.ts` (already handles all CRUD)
- Backend tests: `backend/test/todos.test.ts`
- Frontend tests: `frontend/tests/page.test.tsx`
- E2E tests: `e2e/playwright-smoke.test.ts` (extend) or `e2e/persistence.test.ts` (new)

### Frontend API Functions Reference

```typescript
// frontend/src/api/todos.ts — all already implemented
export async function fetchTodos(): Promise<Todo[]>; // GET /todos
export async function createTodo(text: string): Promise<Todo>; // POST /todos
export async function updateTodoStatus(
  id: number,
  status: TodoStatus,
): Promise<Todo>; // PATCH /todos/:id
export async function updateTodoText(id: number, text: string): Promise<Todo>; // PATCH /todos/:id
export async function deleteTodo(id: number): Promise<void>; // DELETE /todos/:id
```

### Frontend Optimistic Update Pattern (DO NOT CHANGE)

Established in Story 2-11. Each mutation follows this pattern:

```typescript
// 1. Optimistic update — UI changes immediately
setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));

// 2. Send to backend
try {
  const updated = await updateTodoStatus(id, status);
  // 3. Reconcile with server response (e.g. gets updatedAt timestamp)
  setTodos((prev) =>
    prev.map((t) => (t.id === updated.id ? { ...updated } : t)),
  );
} catch {
  // 4. Rollback on failure
  setTodos(previousTodos);
  showToast('...');
}
```

**Do NOT** remove or weaken the rollback logic. This is the user-facing resilience feature.

### Backend PATCH Route Reference

```typescript
// backend/src/routes/todos.ts — existing, correct implementation
const updateData: any = {};
if (status !== undefined) {
  updateData.status = status;
  if (status === 'done') {
    updateData.completedAt = new Date();
  } else {
    updateData.completedAt = null; // cleared when moving out of done
  }
}
if (text !== undefined) {
  const trimmed = text.trim();
  if (!trimmed)
    return reply.code(400).send({ error: 'text must be a non-empty string' });
  updateData.text = trimmed;
}
const todo = await fastify.prisma.todo.update({
  where: { id: idNum },
  data: updateData,
});
```

### Test Strategy

**Backend integration tests** (Vitest + Fastify `inject`):

```typescript
// backend/test/todos.test.ts
it('PATCH status saves to database', async () => {
  // Create a todo
  const post = await app.inject({
    method: 'POST',
    url: '/todos',
    payload: { text: 'auto-save test' },
  });
  const { id } = JSON.parse(post.body);

  // Update status
  const patch = await app.inject({
    method: 'PATCH',
    url: `/todos/${id}`,
    payload: { status: 'done' },
  });
  expect(patch.statusCode).toBe(200);
  const updated = JSON.parse(patch.body);
  expect(updated.status).toBe('done');
  expect(updated.completedAt).not.toBeNull();

  // Verify persisted — GET /todos shows updated status
  const get = await app.inject({ method: 'GET', url: '/todos' });
  const list = JSON.parse(get.body);
  const found = list.find((t: any) => t.id === id);
  expect(found?.status).toBe('done');
});

it('DELETE removes todos from database', async () => {
  const post = await app.inject({
    method: 'POST',
    url: '/todos',
    payload: { text: 'delete me' },
  });
  const { id } = JSON.parse(post.body);

  await app.inject({ method: 'DELETE', url: `/todos/${id}` });

  const get = await app.inject({ method: 'GET', url: '/todos' });
  const list = JSON.parse(get.body);
  expect(list.some((t: any) => t.id === id)).toBe(false);
});
```

**Frontend unit tests** (Vitest + React Testing Library in `frontend/tests/page.test.tsx`):

```typescript
it('calls updateTodoStatus when status changes', async () => {
  // Arrange: render page with one todo
  vi.mocked(fetchTodos).mockResolvedValue([{ id: 1, text: 'test', status: 'todo', ... }]);
  vi.mocked(updateTodoStatus).mockResolvedValue({ id: 1, status: 'done', ... });
  render(<Home />);
  await screen.findByText('test');

  // Act: change status
  fireEvent.change(screen.getByRole('combobox', { name: /change todo status/i }), { target: { value: 'done' } });

  // Assert: API called
  expect(updateTodoStatus).toHaveBeenCalledWith(1, 'done');
});
```

**E2E test** (Playwright):

```typescript
test('status change persists after reload', async ({ page }) => {
  await page.goto('/');
  await page.fill('[placeholder="New todo"]', 'Persist status test');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Persist status test')).toBeVisible();
  // Change status via dropdown
  await page.selectOption('select[aria-label="Change todo status"]', 'done');
  await page.reload();
  // After reload, todo should show as done
  const select = page.locator('select[aria-label="Change todo status"]');
  await expect(select).toHaveValue('done');
});
```

### Relationship to Story 3.1

Story 3.1 establishes that **reads** persist (GET /todos after refresh). Story 3.2 establishes that **writes** persist (mutations are durable). Together they constitute full persistence. Stories can be implemented sequentially or in parallel — there is no code dependency between them.

### Previous Story Learnings (from Epic 2)

- **Optimistic updates + rollback** are already in `page.tsx` for all four mutations. Do NOT remove or bypass them.
- **Toast notifications** on error are already wired up via `showToast()` in `page.tsx`.
- **All API functions** are in `frontend/src/api/todos.ts` — do NOT define inline fetch calls in `page.tsx`.
- **All tests use Vitest** — import `{ vi, describe, it, expect, beforeEach }` from `'vitest'`, NOT from `'jest'`.
- **Mock pattern**: `vi.mock('../src/api/todos', () => ({ fetchTodos: vi.fn(), ... }))` at top of test file.
- **Frontend test setup** is in `frontend/vitest.setup.ts` (jsdom environment configured in `frontend/vitest.config.ts`).

### Coverage Threshold

90% minimum enforced by `scripts/check-coverage.js`. Run after changes:

```bash
cd backend && npm run test:coverage
cd frontend && npm run test:coverage
```

### Project Structure Notes

- Alignment with unified project structure — all files exist, no new directories needed
- Frontend component hierarchy: `page.tsx` → `TodoList.tsx` → `TodoItem.tsx` (mutations handled at `page.tsx` level via callback props)
- Proxy config: `frontend/next.config.ts` routes `/todos*` to backend (check this if local dev tests fail with network errors)

### References

- Backend todos route: [backend/src/routes/todos.ts](backend/src/routes/todos.ts)
- Frontend page (all mutation handlers): [frontend/app/page.tsx](frontend/app/page.tsx)
- Frontend API client: [frontend/src/api/todos.ts](frontend/src/api/todos.ts)
- Frontend page tests: [frontend/tests/page.test.tsx](frontend/tests/page.test.tsx)
- Backend tests: [backend/test/todos.test.ts](backend/test/todos.test.ts)
- E2E tests: [e2e/playwright-smoke.test.ts](e2e/playwright-smoke.test.ts)
- Prisma schema: [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
- Architecture doc: [\_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md)
- Epic definitions: [\_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md#Epic-3)
- Story 2-11 (optimistic updates): [\_bmad-output/implementation-artifacts/2-11-reflect-user-interactions-instantly-without-page-reload.md](_bmad-output/implementation-artifacts/2-11-reflect-user-interactions-instantly-without-page-reload.md)
- Coverage script: [scripts/check-coverage.js](scripts/check-coverage.js)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

- Audited `frontend/app/page.tsx`: all four mutation handlers (`handleAdd`, `handleStatusChange`, `handleEdit`, `handleDelete`) already call the correct API functions with the correct HTTP methods. No production code changes required.
- Verified `frontend/src/api/todos.ts`: all five functions (`fetchTodos`, `createTodo`, `updateTodoStatus`, `updateTodoText`, `deleteTodo`) already use correct HTTP methods and payloads.
- Verified `backend/src/routes/todos.ts`: `PATCH /todos/:id` persists `text` and `status` (including `completedAt` management), `anyOf` validation in place, `DELETE /todos/:id` uses `prisma.todo.delete`, 404 returned on P2025.
- Confirmed frontend tests in `frontend/tests/page.test.tsx` already cover: status change → `updateTodoStatus` called with correct args; edit → `updateTodoText` called; delete → `deleteTodo` called with correct id.
- Added backend round-trip tests to `backend/test/todos.test.ts`:
  - `PATCH status then GET /todos shows updated status in list`
  - `PATCH text then GET /todos shows updated text in list`
  - `DELETE then GET /todos confirms todo no longer in list`
- Confirmed `completedAt` set/cleared tests already existed from prior stories.
- Confirmed e2e tests for status-change, edit, and delete persistence after reload already existed in `e2e/playwright-smoke.test.ts`.
- All 31 backend tests pass; all 91 frontend tests pass.
- Combined coverage: 93.07%.

### File List

- `backend/test/todos.test.ts` — added 3 new PATCH/DELETE→GET round-trip tests
