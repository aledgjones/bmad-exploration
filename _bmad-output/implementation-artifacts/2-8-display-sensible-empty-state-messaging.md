# Story 2.8: Display sensible empty-state messaging

Status: done

## Story

As a user,
I want a friendly message when no todos are present,
so that the interface doesn't feel broken.

## Acceptance Criteria

1. **Given** the backend returns an empty list,
   **When** the frontend renders,
   **Then** it shows a message like "No tasks yet — add one above!" or similar guidance.

2. **Given** no todos exist,
   **When** the empty state is displayed,
   **Then** a visual icon or illustration accompanies the text to make the state feel intentional.

3. **Given** no todos exist,
   **When** the empty state is displayed,
   **Then** the new-todo input form remains visible and usable above the empty-state area.

4. **Given** a user creates the first todo from the empty state,
   **When** the todo is added,
   **Then** the empty-state message disappears and the todo list appears immediately (optimistic update).

5. **Given** a user deletes the last remaining todo,
   **When** the list becomes empty,
   **Then** the empty-state message reappears.

## Tasks / Subtasks

- [x] Enhance empty-state in `TodoList` component (AC: 1, 2)
  - [x] Replace plain `<p>No todos yet.</p>` with a styled empty-state container
  - [x] Add a visual indicator (emoji or simple SVG icon, e.g. clipboard 📋 or ✨)
  - [x] Add descriptive text: "No tasks yet — add one above!"
  - [x] Center the empty-state content with padding for visual balance
  - [x] Use `text-muted-foreground` color class for subtle styling
- [x] Verify form visibility in empty state (AC: 3)
  - [x] No code changes — `NewTodoForm` is rendered by `page.tsx` independently of `TodoList`
  - [x] Verify in tests that input and Add button are present when todo list is empty
- [x] Verify transitions into/out of empty state (AC: 4, 5)
  - [x] No code changes expected — optimistic updates in `page.tsx` already handle state changes
  - [x] When `todos` becomes non-empty, React re-renders `TodoList` which shows items instead of empty state
  - [x] When last todo is deleted, `TodoList` receives empty array and shows empty state
- [x] Update frontend unit tests (AC: 1, 2, 4, 5)
  - [x] `TodoList.test.tsx`: Update existing empty-state test to check for new message text and icon
  - [x] `TodoList.test.tsx`: Verify empty-state container has proper styling classes
  - [x] `page.test.tsx`: Verify form is visible when no todos exist
  - [x] `page.test.tsx`: Verify empty state disappears when first todo is added
  - [x] `page.test.tsx`: Verify empty state reappears when last todo is deleted
- [x] Add e2e test for empty state (AC: 1, 4, 5)
  - [x] Navigate to app with no todos — verify empty-state message visible
  - [x] Create a todo — verify message disappears
  - [x] Delete all todos — verify message reappears

## Dev Notes

### What Already Exists

`TodoList.tsx` already returns an empty-state message:

```tsx
if (todos.length === 0) {
  return <p className="mt-4">No todos yet.</p>;
}
```

`TodoList.test.tsx` already tests for the text:

```tsx
it('renders message when there are no todos', () => {
  render(
    <TodoList
      todos={[]}
      onStatusChange={vi.fn()}
      onDelete={vi.fn()}
      onEdit={vi.fn()}
    />,
  );
  expect(screen.getByText(/no todos yet/i)).toBeInTheDocument();
});
```

### Implementation — TodoList.tsx

**File**: `frontend/app/components/TodoList.tsx`

Replace the plain `<p>` with a styled empty-state block:

```tsx
if (todos.length === 0) {
  return (
    <div
      className="mt-8 w-full flex flex-col items-center justify-center py-12 text-center"
      data-testid="empty-state"
    >
      <span className="text-4xl mb-3" role="img" aria-label="No tasks">
        📋
      </span>
      <p className="text-lg font-medium text-muted-foreground">No tasks yet</p>
      <p className="text-sm text-muted-foreground mt-1">
        Add one above to get started!
      </p>
    </div>
  );
}
```

**Key decisions:**

- Use emoji (`📋`) rather than an SVG to avoid adding dependencies or new files
- Add `data-testid="empty-state"` for easy test targeting
- Use `role="img"` with `aria-label` on the emoji for screen readers
- Use existing Tailwind variables (`text-muted-foreground`) for consistent theming
- Use `text-lg` for primary message and `text-sm` for secondary hint

### No Backend Changes

Frontend-only story. No backend, API client, or database changes.

### No New Files

All changes are in existing files.

### Testing Strategy

**Frontend component tests** (`frontend/tests/TodoList.test.tsx`):

- Update the existing empty-state test to check for new text content ("No tasks yet", "Add one above")
- Verify `data-testid="empty-state"` container exists
- Verify emoji is present with `role="img"`

**Frontend page tests** (`frontend/tests/page.test.tsx`):

- Add test: when `fetchTodos` returns `[]`, the empty-state is shown and the form input is visible
- Add test: when a todo is created from empty state, the empty-state disappears
- Add test: when last todo is deleted, the empty-state reappears (verify "No tasks yet" text)

**E2E test** (`e2e/playwright-smoke.test.ts`):

- Note: Because e2e tests share state across test cases (compose stack persists between tests), ensure the test starts from a clean state or accounts for existing todos
- Create test that deletes all existing todos, verifies empty state, creates one, verifies empty state gone

### Anti-Patterns to Avoid

- Do NOT hide the `NewTodoForm` in empty state — it must always be visible
- Do NOT add a link or button inside the empty state that duplicates the form (the form is already prominently placed above)
- Do NOT use an external SVG library or icon pack — use emoji for simplicity
- Do NOT change the condition — keep `todos.length === 0` as is
- Do NOT add loading skeletons here — that's Story 2.9
- Do NOT use `waitForTimeout` in e2e tests — use deterministic waits

### Previous Story Intelligence

- **Pattern consistency**: All `TodoList` rendering follows props-driven logic. The empty state is simply the `todos.length === 0` branch.
- **Test pattern**: `TodoList.test.tsx` already covers this branch; update the assertion text.
- **Optimistic updates**: Already work correctly via `page.tsx` handlers — no changes needed for AC 4, 5.

### Project Structure Notes

- `frontend/app/components/TodoList.tsx` — modify empty-state rendering
- `frontend/tests/TodoList.test.tsx` — update empty-state test
- `frontend/tests/page.test.tsx` — add empty-state transition tests
- `e2e/playwright-smoke.test.ts` — add empty-state e2e test

### References

- [Source: \_bmad-output/planning-artifacts/epics.md#Story 2.8](epics.md) — acceptance criteria
- [Source: \_bmad-output/planning-artifacts/prd.md#Functional Requirements](prd.md) — FR8
- [Source: \_bmad-output/planning-artifacts/architecture.md#Frontend Architecture](architecture.md) — component patterns
- FR8: The interface displays sensible empty-state messaging when no todos exist.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — all tests passed on first run after implementation.

### Completion Notes List

- Replaced plain `<p>No todos yet.</p>` with styled empty-state container using `data-testid="empty-state"`, 📋 emoji with `role="img"` and `aria-label`, centered layout with `py-12`, and `text-muted-foreground` styling.
- Updated `TodoList.test.tsx`: replaced existing empty-state test with comprehensive assertions for container, icon, message text, hint text, and styling classes.
- Added 3 new tests to `page.test.tsx`: (1) empty-state + form visibility (AC 3), (2) empty-state disappears on add (AC 4), (3) empty-state reappears on delete of last todo (AC 5).
- Added e2e test in `playwright-smoke.test.ts`: deletes all existing todos, verifies empty-state, creates a todo to verify it disappears, deletes it to verify it reappears.
- No backend changes needed — frontend-only story.
- All 58 frontend tests pass (9 test files). No regressions.

### Change Log

- 2026-03-02: Implemented Story 2.8 — empty-state messaging with icon, styled container, and full test coverage (unit + e2e).
- 2026-03-02: Code review fixes applied:
  - [M1] `e2e/playwright-smoke.test.ts`: replaced `waitForTimeout(300)` with `deleteBtn.waitForElementState('detached')` in delete loop
  - [M2] `e2e/playwright-smoke.test.ts`: replaced racy `page.$` + `toBeNull` assertion with `waitForSelector(..., { state: 'detached' })`
  - [L1] `frontend/app/components/TodoList.tsx`: corrected `aria-label` from `"No tasks"` to `"No tasks yet"` to match visible heading text
  - [L2] `frontend/tests/TodoList.test.tsx`: added layout class assertions for `flex`, `flex-col`, `items-center`, `justify-center`, `py-12`, `mt-8`
  - [L3] `frontend/tests/page.test.tsx`: added test verifying `empty-state` is not rendered while `Loading...` is visible

### File List

- frontend/app/components/TodoList.tsx (modified — empty-state rendering, aria-label fix)
- frontend/tests/TodoList.test.tsx (modified — updated empty-state test, added layout class assertions)
- frontend/tests/page.test.tsx (modified — added 3 empty-state tests + loading-state guard test)
- e2e/playwright-smoke.test.ts (modified — added empty-state e2e test, fixed waitForTimeout and race condition)
