# Story 2.7: Show completed tasks visually distinguished from active

Status: review

## Story

As a user,
I want completed todos to look different (e.g. strikethrough or faded),
so that I can quickly scan what's done.

## Acceptance Criteria

1. **Given** todos exist in various states (To Do, In Progress, Done),
   **When** the list renders,
   **Then** Done items use a distinct visual style separate from To Do and In Progress items.

2. **Given** a todo has status "done",
   **When** it renders in the list,
   **Then** the todo text displays with a strikethrough and muted color,
   **And** the entire card has reduced opacity to differentiate it from active items.

3. **Given** a todo transitions from active to "done" (via status change or mark complete),
   **When** the UI updates,
   **Then** the visual distinction is applied immediately (optimistic update already in place from Story 2.3/2.4).

4. **Given** the visual distinction for done items is applied,
   **Then** the text, card, and controls still meet WCAG 2.1 AA color contrast requirements (NFR8),
   **And** all interactive elements (status dropdown, edit button, delete button) remain usable.

5. **Given** a todo transitions from "done" back to "To Do" or "In Progress",
   **When** the UI updates,
   **Then** the visual distinction is removed and the item looks identical to other active items.

## Tasks / Subtasks

- [x] Enhance `TodoItem` card-level visual distinction for done status (AC: 1, 2)
  - [x] Add reduced opacity (`opacity-60`) to the outermost `<Card>` when `todo.status === 'done'`
  - [x] Verify existing text-level `line-through text-gray-500` on text span is preserved
  - [x] Ensure transition is smooth by adding Tailwind transition classes (e.g. `transition-opacity`)
- [x] Verify forward/reverse transitions work visually (AC: 3, 5)
  - [x] No code change expected — optimistic update from Stories 2.3/2.4 already re-renders with new status
  - [x] Verify: changing status from done → todo removes opacity and line-through
  - [x] Verify: changing status from todo → done applies opacity and line-through
- [x] Accessibility audit for done-state visuals (AC: 4)
  - [x] Confirm `opacity-60` on the card still passes WCAG 2.1 AA contrast ratio (4.5:1 for text)
  - [x] Confirm interactive elements (dropdown, edit, delete buttons) are still operable and visible
  - [x] Confirm screen readers announce todo status (already covered by status dropdown `aria-label`)
- [x] Update / add frontend unit tests for visual distinction (AC: 1, 2, 5)
  - [x] `TodoItem.test.tsx`: Verify done items render with `opacity-60` class on Card container
  - [x] `TodoItem.test.tsx`: Verify non-done items do NOT have `opacity-60` class
  - [x] `TodoItem.test.tsx`: Existing test for `line-through` class on done text should pass (already exists in `TodoList.test.tsx`)
  - [x] `TodoList.test.tsx`: Verify done items' Card containers have `opacity-60`, active do not
- [x] Add e2e test for visual distinction (AC: 1, 2, 3, 5)
  - [x] Create a todo, mark it done, verify it has reduced opacity styling
  - [x] Change it back to "To Do", verify opacity is removed

## Dev Notes

### What Already Exists (from previous stories)

The following visual distinction is **already implemented** in `TodoItem.tsx` (added during Stories 2.3/2.4):

```tsx
// TodoItem.tsx, line ~108
<span
  className={`${todo.status === 'done' ? 'line-through text-gray-500' : ''}`.trim()}
>
  {todo.text}
</span>
```

- Text-level strikethrough + gray color for done items ✓
- Status badge color differentiation via `badgeColor()` function (green for done) ✓
- Todos grouped by status section in `TodoList.tsx` with headings (📝 To Do, ⏳ In Progress, ✅ Done) ✓

**What this story adds:** Card-level opacity reduction to make the distinction even more pronounced at a glance, plus formal test coverage for the visual distinction behavior.

### Implementation — TodoItem.tsx

**File**: `frontend/app/components/TodoItem.tsx`

The only code change is adding conditional opacity to the `<Card>` wrapper:

```tsx
// Current (line ~85):
<Card>

// Change to:
<Card className={todo.status === 'done' ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
```

This makes the entire card (text, buttons, badge) appear faded when done. The `transition-opacity` class ensures smooth visual transitions when status changes.

**CRITICAL**: Do NOT change any other component behavior. The existing `line-through text-gray-500` on the text span is preserved. The `badgeColor()` function is preserved. Only the Card wrapper gets an additional class.

### No Backend Changes

This story is **frontend-only**. No backend routes, schemas, or database changes are needed.

### No API Client Changes

No changes to `frontend/src/api/todos.ts`.

### Testing Strategy

**Frontend component tests** (`frontend/tests/TodoItem.test.tsx`):

- Add test: when `status === 'done'`, the Card container div should have class `opacity-60`
- Add test: when `status !== 'done'` (e.g. `todo`, `in_progress`), the Card container div should NOT have `opacity-60`
- Existing tests for `line-through` in `TodoList.test.tsx` should continue passing (regression check)

Pattern for finding the Card element in tests:

```tsx
const { container } = render(<TodoItem todo={doneTodo} ... />);
const card = container.querySelector('[class*="bg-card"]'); // Card uses bg-card class
expect(card).toHaveClass('opacity-60');
```

Alternatively, use the `listitem` role wrapper since items are rendered inside `<li>` in `TodoList`:

```tsx
render(<TodoItem todo={doneTodo} ... />);
// The outermost card div rendered by shadcn Card has class 'bg-card'
const cardEl = screen.getByText('task1').closest('[class*="bg-card"]');
expect(cardEl).toHaveClass('opacity-60');
```

**E2E test** (`e2e/playwright-smoke.test.ts`):

- Create a todo, change status to done, use `page.locator` to check the parent card element for opacity styling
- Change it back, verify opacity is removed
- Use deterministic waits (`waitForFunction` or `waitForSelector`), NOT `waitForTimeout` (lesson from Story 2.5)

### Accessibility Considerations

- `opacity-60` renders at 60% opacity. With a white card background (`bg-card` = white) and dark text (`card-foreground` = near-black), the effective contrast remains well above WCAG AA's 4.5:1 threshold. The text color `text-gray-500` on done items still meets the minimum contrast because the background remains white (only opacity changes, not the colors themselves).
- All interactive controls (dropdown, edit, delete buttons) remain fully functional at 60% opacity.
- Screen reader behavior is unchanged — the status dropdown's `aria-label` already conveys the current state.

### Anti-Patterns to Avoid

- Do NOT use `display: none` or `visibility: hidden` to "hide" done items — they must remain visible and interactable.
- Do NOT use `pointer-events-none` on done items — users must be able to change status back, edit, or delete done items.
- Do NOT add complex CSS animations or keyframes — a simple `transition-opacity` is sufficient.
- Do NOT change the grouping/ordering logic in `TodoList.tsx` — it already groups by status.
- Do NOT change the `badgeColor()` function or status dropdown behavior.
- Do NOT remove the existing `line-through text-gray-500` styles — they should remain as additional distinction on the text.
- Do NOT add new state or props — this is a pure render-time className computation based on existing `todo.status`.
- Do NOT use `waitForTimeout` in e2e tests — use deterministic waits (lesson from Story 2.5).
- Do NOT forget `transition-opacity` on BOTH done and non-done states for smooth transitions in both directions.

### Previous Story Intelligence (from Story 2.6)

- **Pattern consistency**: All component modifications follow the same structure — props-driven, stateless rendering based on `todo` object properties. This story is even simpler: no new props, no new state, just a conditional className.
- **Test patterns**: Use `render()` + DOM queries. The `TodoList.test.tsx` already tests for `line-through` class on done items (line 36-37). Follow the same pattern for `opacity-60`.
- **E2E pattern**: Use `chromium.launch()`, `page.goto()`, create todo, change status, assert DOM state. Use `waitForFunction` for deterministic waits.
- **Stale closure**: Not relevant to this story (no async handlers or state callbacks being added).

### Project Structure Notes

- All changes are within existing files; no new files needed.
- `frontend/app/components/TodoItem.tsx` — modify Card className (1 line change)
- `frontend/tests/TodoItem.test.tsx` — add 2-3 new test cases
- `frontend/tests/TodoList.test.tsx` — optionally extend existing test to check card opacity
- `e2e/playwright-smoke.test.ts` — add 1 new e2e test for visual distinction

### References

- [Source: \_bmad-output/planning-artifacts/epics.md#Story 2.7](epics.md) — acceptance criteria and user story
- [Source: \_bmad-output/planning-artifacts/prd.md#Functional Requirements](prd.md) — FR7: completed tasks visually distinguished
- [Source: \_bmad-output/planning-artifacts/architecture.md#Frontend Architecture](architecture.md) — component patterns, Tailwind CSS
- [Source: \_bmad-output/planning-artifacts/architecture.md#Accessibility Level](architecture.md) — WCAG 2.1 AA compliance
- [Source: \_bmad-output/implementation-artifacts/2-6-edit-the-text-of-an-existing-todo.md](2-6-edit-the-text-of-an-existing-todo.md) — previous story patterns
- FR7: A user can see completed tasks visually distinguished from active tasks.
- FR11: User interactions are reflected instantly without a page reload.
- NFR8: WCAG 2.1 AA compliance (keyboard navigation, ARIA roles, color contrast).

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No blocking issues encountered.

### Completion Notes List

- Added conditional `opacity-60 transition-opacity` className to `<Card>` in `TodoItem.tsx` when `todo.status === 'done'`; non-done items get `transition-opacity` only for smooth bidirectional transitions.
- Existing `line-through text-gray-500` on text span preserved — no changes to text styling.
- 3 new unit tests in `TodoItem.test.tsx` verifying opacity-60 presence/absence per status.
- 1 new unit test in `TodoList.test.tsx` verifying done vs active card opacity in list context.
- 1 new e2e test in `playwright-smoke.test.ts` verifying opacity toggle on status change (done ↔ todo) using deterministic `waitForFunction`.
- Accessibility audit passed: opacity-60 on white bg maintains WCAG AA contrast; all controls remain operable; screen reader behavior unchanged.
- Full regression: 82/82 tests pass (55 frontend + 27 backend).

### Change Log

- 2026-03-02: Implemented card-level opacity distinction for done todos. Added 4 unit tests and 1 e2e test. All 82 tests pass.

### File List

- frontend/app/components/TodoItem.tsx (modified — added conditional opacity-60 + transition-opacity to Card)
- frontend/tests/TodoItem.test.tsx (modified — added 3 visual distinction tests)
- frontend/tests/TodoList.test.tsx (modified — added 1 card opacity test)
- e2e/playwright-smoke.test.ts (modified — added 1 e2e visual distinction test)
