# Story 2.12: Core actions work without onboarding or help text

Status: ready-for-dev

## Story

As a user,
I want to understand and perform all core actions intuitively without instructions,
so that I can use the app immediately.

## Acceptance Criteria

1. **Given** a first-time user opens the app,
   **When** they look at the interface,
   **Then** they can identify how to create a todo without any help text.

2. **Given** a user sees a todo item,
   **When** they look at the available controls,
   **Then** they can identify how to change status, edit, complete, and delete the todo without instructions.

3. **Given** all interactive elements,
   **When** examined,
   **Then** each has a clear visual affordance (icon, label, or tooltip) indicating its purpose,
   **And** each has appropriate ARIA attributes for screen reader users.

4. **Given** all interactive elements,
   **When** navigated with keyboard only,
   **Then** all actions (create, change status, edit, save, cancel, delete) can be completed using Tab, Enter, Escape, and standard keyboard controls.

5. **Given** the interface,
   **When** rendered,
   **Then** no onboarding overlay, tutorial, or help text is displayed (the UI is self-explanatory).

## Tasks / Subtasks

- [ ] Audit all interactive elements for affordance and ARIA compliance (AC: 2, 3)
  - [ ] `NewTodoForm`: Input has `placeholder="New todo"` ✓ and hidden `<label>` ✓ and Add button ✓
  - [ ] `TodoItem` status dropdown: has `aria-label="Change todo status"` ✓ and color-coded badge ✓
  - [ ] `TodoItem` edit button: has `aria-label="Edit todo"` ✓ and ✎ icon ✓
  - [ ] `TodoItem` delete button: has `aria-label="Delete todo"` ✓ and × icon ✓
  - [ ] `TodoItem` edit mode: input has `aria-label="Edit todo text"` ✓, save (✓) has `aria-label="Save edit"` ✓, cancel (✗) has `aria-label="Cancel edit"` ✓
  - [ ] Add `title` attributes to icon-only buttons for hover tooltips on non-touch devices
- [ ] Add `title` tooltips to icon-only buttons for discoverability (AC: 2, 3)
  - [ ] Edit button (✎): `title="Edit"`
  - [ ] Delete button (×): `title="Delete"`
  - [ ] Save edit button (✓): `title="Save"`
  - [ ] Cancel edit button (✗): `title="Cancel"`
- [ ] Keyboard navigation audit and fixes (AC: 4)
  - [ ] Verify Tab order flows logically: input → Add button → (for each todo) status dropdown → edit → delete
  - [ ] Verify Enter submits the new-todo form ✓
  - [ ] Verify Enter saves text edit ✓
  - [ ] Verify Escape cancels text edit ✓
  - [ ] Verify Space/Enter activates buttons (default browser behavior for `<button>`) ✓
  - [ ] Fix any elements using `<div>` with `onClick` that should be `<button>` (check for missing keyboard handlers)
- [ ] Verify no onboarding/help text exists (AC: 5)
  - [ ] Confirm no tutorial overlays, tooltips-on-first-load, or help modals are rendered
  - [ ] Confirm no "how to use" text appears in the UI
  - [ ] This is a verification-only check — the app currently has no onboarding
- [ ] Add accessibility and usability unit tests (AC: 1, 2, 3, 4)
  - [ ] `NewTodoForm.test.tsx`: Verify hidden label exists (already tested ✓)
  - [ ] `TodoItem.test.tsx`: Verify all buttons have `aria-label` attributes (partially tested ✓)
  - [ ] `TodoItem.test.tsx`: Verify icon buttons have `title` attributes (new test)
  - [ ] `TodoItem.test.tsx`: Verify keyboard navigation works within edit mode (Enter saves, Escape cancels — already tested ✓)
  - [ ] `page.test.tsx`: Verify no elements with "help", "tutorial", or "onboarding" text exist
- [ ] Add e2e keyboard-only test (AC: 4)
  - [ ] Complete full workflow using only keyboard: Tab to input, type, Enter to add, Tab to status, change, Tab to edit, Enter, type, Enter to save, Tab to delete, Enter to delete
  - [ ] Verify all actions complete successfully without mouse/touch

## Dev Notes

### What Already Exists — Nearly Complete

The app was built with accessibility in mind from the start. All interactive elements already have:

- **ARIA labels**: Every button, select, and input has an `aria-label` ✓
- **Semantic HTML**: Uses `<button>`, `<select>`, `<input>`, `<form>` — all natively keyboard-accessible ✓
- **Hidden label**: `NewTodoForm` has a visually hidden `<label>` for the input ✓
- **Keyboard shortcuts**: Enter to submit/save, Escape to cancel ✓
- **No onboarding**: No tutorials, modals, or help text exist ✓

### Primary Changes: Title Tooltips

The only production code change is adding `title` attributes to icon-only buttons for hover discoverability:

**File**: `frontend/app/components/TodoItem.tsx`

```tsx
// Edit button
<button aria-label="Edit todo" title="Edit" ... >✎</button>

// Delete button
<button aria-label="Delete todo" title="Delete" ... >×</button>

// Save edit button
<button aria-label="Save edit" title="Save" ... >✓</button>

// Cancel edit button
<button aria-label="Cancel edit" title="Cancel" ... >✗</button>
```

This adds browser-native tooltips on hover, helping sighted users understand icon-only buttons without requiring onboarding.

### No Backend Changes

Frontend-only story. No backend, API, or database changes.

### Testing Strategy

**Unit tests** (`frontend/tests/TodoItem.test.tsx`):

- Add test: each icon button has a `title` attribute
  ```tsx
  it('icon buttons have title tooltips', () => {
    render(<TodoItem todo={baseTodo} ... />);
    expect(screen.getByLabelText('Edit todo')).toHaveAttribute('title', 'Edit');
    expect(screen.getByLabelText('Delete todo')).toHaveAttribute('title', 'Delete');
  });
  ```
- Add test: edit mode buttons have titles
  ```tsx
  it('edit mode buttons have title tooltips', () => {
    render(<TodoItem todo={baseTodo} ... />);
    fireEvent.click(screen.getByLabelText('Edit todo'));
    expect(screen.getByLabelText('Save edit')).toHaveAttribute('title', 'Save');
    expect(screen.getByLabelText('Cancel edit')).toHaveAttribute('title', 'Cancel');
  });
  ```

**Page-level test** (`frontend/tests/page.test.tsx`):

- Add test: verify no onboarding elements
  ```tsx
  it('does not render onboarding or help text', async () => {
    mockedFetch.mockResolvedValue([]);
    render(<Home />);
    await waitFor(() => expect(mockedFetch).toHaveBeenCalled());
    expect(
      screen.queryByText(/help|tutorial|onboarding|how to|getting started/i),
    ).not.toBeInTheDocument();
  });
  ```

**E2E keyboard test** (`e2e/playwright-smoke.test.ts`):

- Full keyboard-only workflow:
  1. Tab to input, type text, press Enter → todo created
  2. Tab to status dropdown, select new status → status changed
  3. Tab to edit button, press Enter → edit mode
  4. Type new text, press Enter → text saved
  5. Tab to delete button, press Enter → confirm dialog → delete
- Use `page.keyboard.press('Tab')`, `page.keyboard.type(...)`, `page.keyboard.press('Enter')` throughout

### Anti-Patterns to Avoid

- Do NOT add onboarding, tutorials, or help text — the story specifically requires their absence
- Do NOT add tooltips via JavaScript tooltip libraries — use native HTML `title` attributes
- Do NOT replace existing `aria-label` with `title` — keep both (they serve different audiences)
- Do NOT change button content from icons to text labels — the icons are intentionally compact
- Do NOT add visual labels next to every icon — the `title` tooltip on hover is sufficient
- Do NOT use custom `tabindex` values — let the natural DOM order handle tab navigation
- Do NOT use `waitForTimeout` in e2e tests

### Previous Story Intelligence

- All ARIA attributes were added incrementally across Stories 2.1–2.6
- Keyboard handlers (Enter/Escape) were established in Story 2.6 (edit mode)
- The hidden `<label>` for the input was established in Story 2.1

### Project Structure Notes

- `frontend/app/components/TodoItem.tsx` — modified (add `title` attributes to 4 buttons)
- `frontend/tests/TodoItem.test.tsx` — modified (add title tooltip tests)
- `frontend/tests/page.test.tsx` — modified (add no-onboarding verification test)
- `e2e/playwright-smoke.test.ts` — modified (add keyboard-only workflow test)

### References

- [Source: \_bmad-output/planning-artifacts/epics.md#Story 2.12](epics.md) — acceptance criteria
- [Source: \_bmad-output/planning-artifacts/prd.md#Functional Requirements](prd.md) — FR12
- [Source: \_bmad-output/planning-artifacts/architecture.md#Accessibility Level](architecture.md) — WCAG 2.1 AA
- FR12: Users can perform all core actions without any onboarding or help text.
- NFR8: WCAG 2.1 AA compliance (keyboard navigation, ARIA roles, color contrast).
- NFR9: All interactive elements are usable with both touch and keyboard-only input.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
