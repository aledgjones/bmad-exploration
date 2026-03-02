# Story 2.8: Display sensible empty-state messaging

Status: ready-for-dev

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

- [ ] Enhance empty-state in `TodoList` component (AC: 1, 2)
  - [ ] Replace plain `<p>No todos yet.</p>` with a styled empty-state container
  - [ ] Add a visual indicator (emoji or simple SVG icon, e.g. clipboard 📋 or ✨)
  - [ ] Add descriptive text: "No tasks yet — add one above!"
  - [ ] Center the empty-state content with padding for visual balance
  - [ ] Use `text-muted-foreground` color class for subtle styling
- [ ] Verify form visibility in empty state (AC: 3)
  - [ ] No code changes — `NewTodoForm` is rendered by `page.tsx` independently of `TodoList`
  - [ ] Verify in tests that input and Add button are present when todo list is empty
- [ ] Verify transitions into/out of empty state (AC: 4, 5)
  - [ ] No code changes expected — optimistic updates in `page.tsx` already handle state changes
  - [ ] When `todos` becomes non-empty, React re-renders `TodoList` which shows items instead of empty state
  - [ ] When last todo is deleted, `TodoList` receives empty array and shows empty state
- [ ] Update frontend unit tests (AC: 1, 2, 4, 5)
  - [ ] `TodoList.test.tsx`: Update existing empty-state test to check for new message text and icon
  - [ ] `TodoList.test.tsx`: Verify empty-state container has proper styling classes
  - [ ] `page.test.tsx`: Verify form is visible when no todos exist
  - [ ] `page.test.tsx`: Verify empty state disappears when first todo is added
  - [ ] `page.test.tsx`: Verify empty state reappears when last todo is deleted
- [ ] Add e2e test for empty state (AC: 1, 4, 5)
  - [ ] Navigate to app with no todos — verify empty-state message visible
  - [ ] Create a todo — verify message disappears
  - [ ] Delete all todos — verify message reappears

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
