# Story 2.9: Show loading indicators during data operations

Status: done

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

- [x] Replace plain "Loading..." text with a spinner component (AC: 1, 2)
  - [x] Create a simple `Spinner` component using Tailwind CSS animation (`animate-spin`)
  - [x] Replace `<p className="mt-4">Loading...</p>` in `page.tsx` with `<Spinner />` plus "Loading todos..." text
  - [x] Add `aria-busy="true"` to the main content area while loading
  - [x] Add `role="status"` and `aria-label="Loading todos"` to the spinner for screen reader support
- [x] Add loading/disabled state to the Add button during submission (AC: 3)
  - [x] Add `submitting` state to `NewTodoForm`
  - [x] Disable the Add button and show a spinner inside it while `submitting` is true
  - [x] Prevent double-submission by guarding `handleSubmit` with `submitting` flag
  - [x] Re-enable button when submission completes (success or failure)
- [x] Accessibility for loading states (AC: 4)
  - [x] Ensure spinner has `role="status"` for live region announcement
  - [x] Ensure button disabled state has proper `aria-disabled` or `disabled` attribute
- [x] Update frontend unit tests (AC: 1, 2, 3)
  - [x] `page.test.tsx`: Verify spinner renders during initial load (before `fetchTodos` resolves)
  - [x] `page.test.tsx`: Verify spinner disappears once todos are loaded
  - [x] `page.test.tsx`: Verify `aria-busy` is set on container during loading
  - [x] `NewTodoForm.test.tsx`: Verify Add button is disabled during submission
  - [x] `NewTodoForm.test.tsx`: Verify Add button re-enables after successful submission
  - [x] `NewTodoForm.test.tsx`: Verify Add button re-enables after failed submission
  - [x] `NewTodoForm.test.tsx`: Verify double-click doesn't trigger multiple submissions
- [x] Add e2e test for loading state (AC: 1)
  - [x] On page load, verify the spinner briefly appears before todos render

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

Claude Sonnet 4.6

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Created `frontend/app/components/Spinner.tsx`: inline SVG spinner with `animate-spin`, `role="status"`, `aria-label` prop, `aria-hidden` on SVG graphic. Configurable `label` prop.
- Updated `frontend/app/page.tsx`: replaced `<p>Loading...</p>` with `<Spinner label="Loading todos" />` wrapped in `aria-busy="true"` container div.
- Updated `frontend/app/components/NewTodoForm.tsx`: added `submitting` state, guards `handleSubmit` against double-submission, button shows "Adding..." and is `disabled` while submitting, re-enables in `finally` block.
- Created `frontend/tests/Spinner.test.tsx`: 5 tests covering default/custom label, `role="status"`, SVG `aria-hidden`, `animate-spin` class.
- Updated `frontend/tests/page.test.tsx`: replaced `'Loading...'` text assertions with `role="status"` / `aria-busy` queries; added 3 new spinner tests.
- Updated `frontend/tests/NewTodoForm.test.tsx`: added 4 new submission-state tests (disabled during submit, re-enable on success/failure, double-click prevention).
- Updated `e2e/playwright-smoke.test.ts`: added e2e test that delays GET /todos 300ms via route intercept and asserts spinner appears then detaches.
- All 71 frontend unit tests pass; no regressions.

### File List

- `frontend/app/components/Spinner.tsx` — new
- `frontend/app/page.tsx` — modified
- `frontend/app/components/NewTodoForm.tsx` — modified
- `frontend/tests/Spinner.test.tsx` — new
- `frontend/tests/page.test.tsx` — modified
- `frontend/tests/NewTodoForm.test.tsx` — modified
- `e2e/playwright-smoke.test.ts` — modified

## Change Log

- 2026-03-02: Story 2.9 implemented — loading spinner, Add button submission state, aria-busy/role=status accessibility, 12 new unit tests, 1 new e2e test.
