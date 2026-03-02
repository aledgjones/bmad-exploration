# Story 2.6: Edit the text of an existing todo

Status: done

## Story

As a user,
I want to change the description of a todo after creating it,
so that I can correct mistakes or refine the task.

## Acceptance Criteria

1. **Given** a todo item is displayed,
   **When** I click an edit icon/button,
   **Then** the todo text becomes an editable input field pre-populated with the current text.

2. **Given** I am editing a todo's text,
   **When** I modify the text and press Enter or click a Save button,
   **Then** the updated text shows in the UI immediately (optimistic update),
   **And** a PATCH request is sent to `/todos/:id` with `{ "text": "<new text>" }` and the server persists the change.

3. **Given** I am editing a todo's text,
   **When** I press Escape or click a Cancel button,
   **Then** the edit is discarded and the original text is restored.

4. **Given** I submit an edit with empty or whitespace-only text,
   **Then** the edit is rejected (input validation) and the original text is preserved.

5. **Given** a PATCH request to update text fails (network error or server error),
   **Then** the optimistic update is rolled back to the original text,
   **And** an error message is shown to the user.

## Tasks / Subtasks

- [x] Extend backend PATCH `/todos/:id` to accept optional `text` field (AC: 2)
  - [x] Change body schema: make `status` optional, add optional `text` (minLength: 1), require at least one of `status` or `text`
  - [x] Trim and validate `text` if provided (non-empty after trim)
  - [x] Return 400 if neither `status` nor `text` is provided
  - [x] Return 400 if `text` is empty/whitespace-only
  - [x] Include `text` in Prisma `update` data when provided
  - [x] Add log line for text updates
- [x] Add `updateTodoText(id: number, text: string)` to frontend API client (AC: 2)
  - [x] Send PATCH to `/todos/${id}` with `{ text }` body
  - [x] Follow existing error-handling pattern from `updateTodoStatus`
  - [x] Return updated `Todo` object
- [x] Add inline edit mode to `TodoItem` component (AC: 1, 2, 3, 4)
  - [x] Add `onEdit: (id: number, text: string) => void` prop to `TodoItemProps`
  - [x] Add local state: `isEditing` (boolean), `editText` (string)
  - [x] Add edit (pencil) button next to delete button
  - [x] When editing: replace text span with `<input>` pre-filled with `todo.text`
  - [x] On Enter or Save click: validate non-empty, call `onEdit(todo.id, editText.trim())`
  - [x] On Escape or Cancel click: reset `editText` to `todo.text`, set `isEditing = false`
  - [x] On empty submit: do not call onEdit, keep in edit mode (or show inline validation)
  - [x] Auto-focus the input when entering edit mode
- [x] Pass `onEdit` prop through `TodoList` to `TodoItem` (AC: 2)
  - [x] Add `onEdit: (id: number, text: string) => void` to `TodoListProps`
  - [x] Pass through to each `<TodoItem>`
- [x] Add `handleEdit` to `page.tsx` with optimistic update and rollback (AC: 2, 5)
  - [x] Save previous text before update
  - [x] Optimistically update text in state: `setTodos(prev => prev.map(t => t.id === id ? { ...t, text } : t))`
  - [x] Call `updateTodoText(id, text)` API
  - [x] On success: reconcile with server response (update `updatedAt` etc.)
  - [x] On failure: rollback to previous text, show `alert('Unable to update todo')`
  - [x] Pass `onEdit={handleEdit}` to `<TodoList>`
- [x] Add backend unit tests for PATCH text update (AC: 2, 4)
  - [x] Test PATCH with `{ text: "new text" }` returns updated todo
  - [x] Test PATCH with both `{ text, status }` updates both fields
  - [x] Test PATCH with empty `{ text: "" }` returns 400
  - [x] Test PATCH with whitespace-only `{ text: "   " }` returns 400
  - [x] Test PATCH with neither text nor status returns 400
  - [x] Existing status-only PATCH tests continue to pass (no regression)
- [x] Add frontend unit tests (AC: 1, 2, 3, 4, 5)
  - [x] Test `updateTodoText` API client (success, failure)
  - [x] Test `TodoItem` renders edit button with proper `aria-label`
  - [x] Test `TodoItem` enters edit mode on edit button click (shows input)
  - [x] Test `TodoItem` saves on Enter key press
  - [x] Test `TodoItem` cancels on Escape key press
  - [x] Test `TodoItem` does NOT call onEdit for empty text
  - [x] Test `Home` page optimistic edit and rollback on failure
- [x] Add e2e Playwright test for edit flow (AC: 2, 3)
  - [x] Create a todo, click edit, change text, save, verify UI updates
  - [x] Reload page and verify edited text persists
  - [x] Test cancel (Escape) discards changes

## Dev Notes

### Backend Implementation

- **Route location**: `backend/src/routes/todos.ts` — modify the existing `fastify.patch('/todos/:id', ...)` handler.
- **Current schema** requires `{ status }` in body with enum constraint. Must change to:
  ```typescript
  body: {
    type: 'object',
    // Remove required: ['status'] — neither field is individually required
    properties: {
      status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
      text: { type: 'string', minLength: 1 },
    },
    // At least one property must be present
    anyOf: [
      { required: ['status'] },
      { required: ['text'] },
    ],
  }
  ```
- **Handler logic**: Build `updateData` object conditionally:
  ```typescript
  const updateData: any = {};
  if (status !== undefined) {
    updateData.status = status;
    updateData.completedAt = status === 'done' ? new Date() : null;
  }
  if (text !== undefined) {
    const trimmed = text.trim();
    if (!trimmed) {
      return reply.code(400).send({ error: 'text must be a non-empty string' });
    }
    updateData.text = trimmed;
  }
  ```
- **Log line**: `fastify.log.info(\`PATCH /todos/${idNum} ${Object.keys(updateData).join(',')}\`)`
- **CRITICAL**: Existing status-only PATCH must continue working unchanged. The schema change from `required: ['status']` to `anyOf` achieves this.

### Frontend API Client

- **File**: `frontend/src/api/todos.ts` — add `updateTodoText` export below `updateTodoStatus`.
- **Pattern**: Follow the identical error-handling pattern as `updateTodoStatus`:
  ```typescript
  export async function updateTodoText(
    id: number,
    text: string,
  ): Promise<Todo> {
    const res = await fetch(`/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      let msg = `failed to update text: ${res.status}`;
      try {
        const data = await res.json();
        if (data && typeof data.error === 'string') msg += ` ${data.error}`;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return res.json();
  }
  ```

### Frontend UI — TodoItem Inline Edit

- **File**: `frontend/app/components/TodoItem.tsx`
- **New props**: Add `onEdit: (id: number, text: string) => void` to `TodoItemProps`.
- **Local state**: `const [isEditing, setIsEditing] = useState(false)` and `const [editText, setEditText] = useState(todo.text)`.
- **Edit button**: Add a pencil/edit button (`✎` or similar) with `aria-label="Edit todo"` next to the delete button `×`.
- **Edit mode rendering**: When `isEditing` is true:
  - Replace the `<span>` displaying `todo.text` with an `<input>` element.
  - Set `defaultValue={todo.text}`, auto-focus via `autoFocus` prop or `useRef`.
  - On `keyDown`: Enter → save (if valid), Escape → cancel.
  - Add small Save (✓) and Cancel (✗) buttons alongside the input.
- **Save logic**:
  ```typescript
  const handleSave = () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === todo.text) {
      setEditText(todo.text);
      setIsEditing(false);
      return;
    }
    onEdit(todo.id, trimmed);
    setIsEditing(false);
  };
  ```
- **Cancel logic**: `setEditText(todo.text); setIsEditing(false);`
- **Sync with prop changes**: Use `useEffect` to reset `editText` when `todo.text` changes (handles optimistic rollback).
- **Accessibility**: Input must have `aria-label="Edit todo text"`. Save/Cancel buttons must have descriptive `aria-label` attributes.

### TodoList Passthrough

- **File**: `frontend/app/components/TodoList.tsx`
- Add `onEdit: (id: number, text: string) => void` to `TodoListProps`.
- Pass `onEdit={onEdit}` to each `<TodoItem>`.

### Page Handler

- **File**: `frontend/app/page.tsx`
- Import `updateTodoText` from API client.
- Add `handleEdit` async function following the established optimistic pattern:
  ```typescript
  const handleEdit = async (id: number, text: string) => {
    let previousText: string | undefined;
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          previousText = t.text;
          return { ...t, text };
        }
        return t;
      }),
    );
    try {
      const updated = await updateTodoText(id, text);
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updated } : t)),
      );
    } catch (err: any) {
      console.error('edit failed', err);
      alert('Unable to update todo');
      if (previousText !== undefined) {
        setTodos((prev) =>
          prev.map((t) => (t.id === id ? { ...t, text: previousText! } : t)),
        );
      }
    }
  };
  ```
- Pass `onEdit={handleEdit}` to `<TodoList>`.

### Testing Strategy

- **Backend tests** (`backend/test/todos.test.ts`):
  - Follow the established pattern: create Fastify instance, register app, use `server.inject()`.
  - Test PATCH with `{ text }` only — returns 200 with updated text.
  - Test PATCH with `{ text, status }` — updates both fields.
  - Test PATCH with `{ text: "" }` — returns 400.
  - Test PATCH with `{ text: "   " }` — returns 400 (whitespace only).
  - Test PATCH with `{}` (no fields) — returns 400.
  - **Regression**: All existing status-only PATCH tests must continue passing.
  - Add prisma-null guard test for text-only PATCH if not already covered.

- **Frontend API tests** (`frontend/tests/todosApi.test.ts`):
  - Add tests for `updateTodoText`: success (returns Todo), failure (throws with status+error).
  - Mock `global.fetch` as established.

- **Frontend component tests**:
  - `TodoItem` tests: renders edit button, enters edit mode, save on Enter, cancel on Escape, rejects empty text.
  - Page tests: optimistic text update and rollback on failure.
  - Mock `updateTodoText` in page tests.

- **E2E test** (`e2e/playwright-smoke.test.ts`):
  - Create a todo, click edit button, modify text in input, press Enter.
  - Verify updated text displays.
  - Reload page, verify edited text persists.
  - Test Escape cancels edit (text reverts to original).

### Anti-Patterns to Avoid

- Do NOT create a separate PATCH endpoint for text — extend the existing `/todos/:id` PATCH handler.
- Do NOT use a modal or `window.prompt()` for editing — use inline edit (input replaces span) for better UX.
- Do NOT skip the optimistic update pattern — it's established across Stories 2.1–2.5 and required by FR11.
- Do NOT forget `aria-label` attributes on the edit button and input for accessibility (NFR8).
- Do NOT allow empty/whitespace-only text to be submitted — validate on both frontend and backend.
- Do NOT break existing status-only PATCH tests — the schema change must be backward compatible.
- Do NOT use `window.confirm()` for edit save — save should be immediate (unlike delete which is destructive).
- Do NOT forget to auto-focus the edit input when entering edit mode.
- Do NOT forget to handle the stale closure pattern — use functional state updates (lesson from Story 2.5: fixed stale closure in handleDelete rollback).
- Do NOT use `waitForTimeout` in e2e tests — use deterministic waits like `waitForSelector` or `waitForFunction` (lesson from Story 2.5).

### Previous Story Intelligence (from Story 2.5)

- **Stale closure fix**: In Story 2.5, `handleDelete` had a stale closure bug in the rollback. The fix was to capture `previousTodos` inside the `setTodos` callback. Apply the same pattern to `handleEdit` — capture `previousText` inside the `setTodos` updater function.
- **E2E flakiness fix**: Replaced `waitForTimeout` with `waitForFunction` for deterministic waits. Continue this approach.
- **Pattern consistency**: All handlers (add, status change, delete) use the same optimistic update + rollback pattern. The edit handler must follow this exactly.

### Project Structure Notes

- All changes are within existing files; no new files needed.
- Backend route file: `backend/src/routes/todos.ts` (modified — extend PATCH handler)
- Frontend API: `frontend/src/api/todos.ts` (modified — add `updateTodoText`)
- Components: `frontend/app/components/TodoItem.tsx` (modified — add inline edit mode), `frontend/app/components/TodoList.tsx` (modified — add `onEdit` prop passthrough)
- Page: `frontend/app/page.tsx` (modified — add `handleEdit` with optimistic update)
- Tests: `backend/test/todos.test.ts`, `frontend/tests/todosApi.test.ts`, `frontend/tests/TodoItem.test.tsx`, `frontend/tests/page.test.tsx`, `e2e/playwright-smoke.test.ts`

### References

- [Source: \_bmad-output/planning-artifacts/epics.md#Story 2.6](epics.md) — acceptance criteria and user story
- [Source: \_bmad-output/planning-artifacts/architecture.md#API & Communication](architecture.md) — RESTful PATCH pattern
- [Source: \_bmad-output/planning-artifacts/architecture.md#Frontend Architecture](architecture.md) — component patterns, state management
- [Source: \_bmad-output/planning-artifacts/prd.md#Functional Requirements](prd.md) — FR6, FR11
- [Source: \_bmad-output/implementation-artifacts/2-5-delete-a-todo-item.md](2-5-delete-a-todo-item.md) — previous story learnings (stale closure, e2e waits)
- FR6: A user can edit the text description of an existing todo item.
- FR11: User interactions (create/update/delete) are reflected instantly without a page reload.
- NFR8: WCAG 2.1 AA compliance (keyboard navigation, ARIA roles).

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (GitHub Copilot)

### Debug Log References

None — all tasks completed without halts or failures.

### Completion Notes List

- Extended backend PATCH `/todos/:id` to accept optional `text` field using `anyOf` schema for backward compatibility. Status-only PATCH continues working unchanged.
- Added `updateTodoText` API client following identical error-handling pattern as `updateTodoStatus`.
- Implemented inline edit mode in `TodoItem` with `isEditing`/`editText` state, auto-focus via `useRef`, Enter/Save to confirm, Escape/Cancel to discard. Empty/whitespace text rejected client-side.
- Passed `onEdit` prop through `TodoList` to `TodoItem`.
- Added `handleEdit` in `page.tsx` with optimistic update and rollback on failure, following established pattern from `handleStatusChange` and `handleDelete`.
- Used `useEffect` to sync `editText` with `todo.text` for rollback scenarios.
- All 27 backend tests pass (5 new PATCH text tests + 2 direct handler text/whitespace tests added).
- All 43 frontend tests pass (3 API client tests, 8 TodoItem edit tests + 2 review additions, 2 page edit tests added). Updated existing tests to pass `onEdit` prop.
- Added 2 e2e Playwright tests: edit-save-persist and cancel-with-Escape.

### Senior Developer Review (AI)

**Date:** 2026-03-01
**Reviewer:** Amelia (Dev Agent) — adversarial code review

**Outcome:** Changes Requested → All fixed → APPROVED

| ID  | Severity | Finding                                                                                                                                                   | Resolution                                                                         |
| --- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| M1  | MEDIUM   | Status dropdown, edit, and delete buttons remained active during inline edit mode — user could delete a todo mid-edit or trigger concurrent status update | Fixed: action div conditionally hidden when `isEditing === true` in `TodoItem.tsx` |
| M2  | MEDIUM   | Dev Agent Record claimed 49 frontend tests; actual count was 41                                                                                           | Fixed: corrected to 43 (post-review additions)                                     |
| L1  | LOW      | `TodoStatus` imported as value not type despite `isolatedModules: true`                                                                                   | Fixed: `import { ..., type TodoStatus }` in `page.tsx`                             |
| L2  | LOW      | No e2e test for AC4 (empty text rejection)                                                                                                                | Fixed: added `empty text submission is rejected` e2e test                          |
| L3  | LOW      | Missing unit test for trimmed-equals-original silent exit path                                                                                            | Fixed: added 2 unit tests — trimmed match and action-buttons-hidden                |

### Change Log

- 2026-03-01: Implemented Story 2.6 — inline todo text editing with optimistic updates, validation, and rollback.
- 2026-03-01: Code review fixes applied — M1 (action buttons hidden during edit mode), M2 (corrected frontend test count to 43), L1 (TodoStatus imported as `type`), L2 (e2e empty-text rejection test added), L3 (trimmed-equals-original unit test + action-buttons-hidden unit test added).

### File List

- backend/src/routes/todos.ts (modified — extended PATCH handler schema and logic for text field)
- frontend/src/api/todos.ts (modified — added `updateTodoText` export)
- frontend/app/components/TodoItem.tsx (modified — added inline edit mode with state, edit/save/cancel buttons)
- frontend/app/components/TodoList.tsx (modified — added `onEdit` prop passthrough)
- frontend/app/page.tsx (modified — added `handleEdit` with optimistic update, imported `updateTodoText`)
- backend/test/todos.test.ts (modified — added 5 PATCH text integration tests + 2 direct handler text tests)
- frontend/tests/todosApi.test.ts (modified — added 3 `updateTodoText` API tests)
- frontend/tests/TodoItem.test.tsx (modified — added 8 edit-mode tests, updated existing tests with `onEdit` prop)
- frontend/tests/page.test.tsx (modified — added 2 edit/rollback tests, added `updateTodoText` mock)
- frontend/tests/TodoList.test.tsx (modified — added `onEdit` prop to renders)
- frontend/tests/Home.test.tsx (modified — added `updateTodoText` to mock)
- e2e/playwright-smoke.test.ts (modified — added 2 e2e edit flow tests)
