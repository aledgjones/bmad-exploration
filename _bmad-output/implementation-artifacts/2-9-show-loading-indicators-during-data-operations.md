# Story 2.9: Show loading indicators during data operations

Status: ready-for-dev

## Story

As a user,
I want visual feedback while todos are being fetched or updated,
so that I know the app is working.

## Acceptance Criteria

1. **Given** a network request is in flight for initial data fetch,
   **When** the UI is waiting for the todo list,
   **Then** a spinner or skeleton placeholder appears in place of the list.

2. **Given** the initial data fetch completes successfully,
   **When** the todos are rendered,
   **Then** the loading indicator disappears and the list (or empty state) is shown.

3. **Given** a user creates a new todo,
   **When** the API request is in flight,
   **Then** the Add button shows a disabled/loading state to prevent double-submission.

4. **Given** the loading indicator is displayed,
   **Then** it is accessible: screen readers can detect the loading state via `aria-busy` or a live region,
   **And** the loading content meets WCAG 2.1 AA standards.

## Tasks / Subtasks

- [ ] Replace plain "Loading..." text with a spinner component (AC: 1, 2)
  - [ ] Create a simple `Spinner` component using Tailwind CSS animation (`animate-spin`)
  - [ ] Replace `<p className="mt-4">Loading...</p>` in `page.tsx` with `<Spinner />` plus "Loading todos..." text
  - [ ] Add `aria-busy="true"` to the main content area while loading
  - [ ] Add `role="status"` and `aria-label="Loading todos"` to the spinner for screen reader support
- [ ] Add loading/disabled state to the Add button during submission (AC: 3)
  - [ ] Add `submitting` state to `NewTodoForm`
  - [ ] Disable the Add button and show a spinner inside it while `submitting` is true
  - [ ] Prevent double-submission by guarding `handleSubmit` with `submitting` flag
  - [ ] Re-enable button when submission completes (success or failure)
- [ ] Accessibility for loading states (AC: 4)
  - [ ] Ensure spinner has `role="status"` for live region announcement
  - [ ] Ensure button disabled state has proper `aria-disabled` or `disabled` attribute
- [ ] Update frontend unit tests (AC: 1, 2, 3)
  - [ ] `page.test.tsx`: Verify spinner renders during initial load (before `fetchTodos` resolves)
  - [ ] `page.test.tsx`: Verify spinner disappears once todos are loaded
  - [ ] `page.test.tsx`: Verify `aria-busy` is set on container during loading
  - [ ] `NewTodoForm.test.tsx`: Verify Add button is disabled during submission
  - [ ] `NewTodoForm.test.tsx`: Verify Add button re-enables after successful submission
  - [ ] `NewTodoForm.test.tsx`: Verify Add button re-enables after failed submission
  - [ ] `NewTodoForm.test.tsx`: Verify double-click doesn't trigger multiple submissions
- [ ] Add e2e test for loading state (AC: 1)
  - [ ] On page load, verify the spinner briefly appears before todos render

## Dev Notes

### What Already Exists

`page.tsx` has a basic loading text:

```tsx
const [loading, setLoading] = useState(true);
// ...
{loading ? (
  <p className="mt-4">Loading...</p>
) : (
  <TodoList ... />
)}
```

Tests already check for the loading→loaded transition implicitly (they wait for todo text to appear).

### Implementation — Spinner Component

**New file**: `frontend/app/components/Spinner.tsx`

```tsx
export default function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2" role="status" aria-label={label}>
      <svg
        className="animate-spin h-5 w-5 text-muted-foreground"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <span className="text-sm text-muted-foreground">{label}...</span>
    </div>
  );
}
```

**Key decisions:**

- Inline SVG avoids external dependencies
- `role="status"` creates a live region for screen readers
- `aria-hidden="true"` on the SVG prevents the graphic from being announced
- Reuses `text-muted-foreground` for consistent theming
- Exported with a configurable `label` prop

### Implementation — page.tsx Loading State

**File**: `frontend/app/page.tsx`

Replace the loading text:

```tsx
// Before:
{loading ? (
  <p className="mt-4">Loading...</p>
) : (
  <TodoList ... />
)}

// After:
{loading ? (
  <div className="mt-8 w-full flex justify-center" aria-busy="true">
    <Spinner label="Loading todos" />
  </div>
) : (
  <TodoList ... />
)}
```

Import `Spinner` at the top of the file.

### Implementation — NewTodoForm.tsx Submission State

**File**: `frontend/app/components/NewTodoForm.tsx`

Add a `submitting` state to prevent double-submission and show feedback:

```tsx
const [submitting, setSubmitting] = useState(false);

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  const trimmed = text.trim();
  if (!trimmed || submitting) return;

  setSubmitting(true);
  try {
    await onSubmit(trimmed);
    setText('');
  } catch (err) {
    console.error('NewTodoForm onSubmit failed', err);
  } finally {
    setSubmitting(false);
  }
};
```

Update the Button:

```tsx
<Button type="submit" data-testid="new-todo-submit" disabled={submitting}>
  {submitting ? 'Adding...' : 'Add'}
</Button>
```

### No Backend Changes

Frontend-only story. No backend, API, or database changes.

### Testing Strategy

**Spinner component tests** (`frontend/tests/Spinner.test.tsx` — new file):

- Renders with default label "Loading"
- Renders with custom label
- Has `role="status"` for accessibility
- SVG has `aria-hidden="true"`

**Page tests** (`frontend/tests/page.test.tsx`):

- Verify that before `fetchTodos` resolves, a spinner with `role="status"` is present
- Verify it disappears after fetch completes
- Existing tests should still pass — they wait for todo text, which appears after loading

**NewTodoForm tests** (`frontend/tests/NewTodoForm.test.tsx`):

- Verify button text changes to "Adding..." during submission
- Verify button has `disabled` attribute during submission
- Verify button re-enables on success or failure
- Verify that calling submit while already submitting doesn't trigger additional `onSubmit` calls

**E2E test** (`e2e/playwright-smoke.test.ts`):

- The e2e loading spinner test is optional — the spinner appears very briefly. If added, use `page.waitForSelector('[role="status"]')` with a short timeout since it may already be gone by the time the assertion runs.

### Anti-Patterns to Avoid

- Do NOT add per-item loading spinners for status changes, edits, or deletes — these use optimistic updates and are instantaneous in the UI
- Do NOT use a full-page overlay or modal spinner — keep it inline
- Do NOT block the entire page during form submission — only disable the submit button
- Do NOT install a spinner library — use inline SVG with Tailwind `animate-spin`
- Do NOT remove the existing "Loading..." text without replacing it with the spinner
- Do NOT use `waitForTimeout` in e2e tests
- Do NOT use `aria-live` directly — `role="status"` implies `aria-live="polite"`

### Previous Story Intelligence

- **Pattern**: Page-level state (`loading`) already controls the branch. Just swap the render output for that branch.
- **NewTodoForm**: Already uses async `handleSubmit` with try/catch. Adding `submitting` state is a small addition.
- **Test patterns**: `page.test.tsx` uses `vi.mock` for API functions and `waitFor` for async assertions. Follow the same patterns.
- **E2E waits**: Use `waitForSelector` or `waitForFunction` from previous stories.

### Project Structure Notes

- `frontend/app/components/Spinner.tsx` — new file (simple spinner component)
- `frontend/app/components/NewTodoForm.tsx` — modified (add submitting state)
- `frontend/app/page.tsx` — modified (replace loading text with Spinner)
- `frontend/tests/Spinner.test.tsx` — new file (spinner tests)
- `frontend/tests/NewTodoForm.test.tsx` — modified (add submission state tests)
- `frontend/tests/page.test.tsx` — modified (update loading state assertions)

### References

- [Source: \_bmad-output/planning-artifacts/epics.md#Story 2.9](epics.md) — acceptance criteria
- [Source: \_bmad-output/planning-artifacts/prd.md#Functional Requirements](prd.md) — FR9
- [Source: \_bmad-output/planning-artifacts/architecture.md#Frontend Architecture](architecture.md) — component patterns
- [Source: \_bmad-output/planning-artifacts/architecture.md#Accessibility Level](architecture.md) — WCAG 2.1 AA
- FR9: The interface shows loading state indicators when data is being fetched or updated.
- NFR1: User actions complete and UI updates within 100 ms.
- NFR8: WCAG 2.1 AA compliance.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
