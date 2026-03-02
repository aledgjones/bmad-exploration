# Story 2.10: Display an error state with retry options

Status: ready-for-dev

## Story

As a user,
I want errors to be surfaced when an operation fails,
so that I can retry or understand what went wrong.

## Acceptance Criteria

1. **Given** the initial fetch for todos returns an error (network failure, server error),
   **When** the frontend detects the failure,
   **Then** an inline error message appears in the content area (not just a browser `alert()`),
   **And** a "Retry" button is displayed that repeats the fetch.

2. **Given** a create/update/delete operation fails,
   **When** the frontend detects the failure,
   **Then** a dismissible toast or inline notification appears with the error message,
   **And** the optimistic update is rolled back (already implemented in Stories 2.1–2.6).

3. **Given** an error notification is displayed for a mutation failure,
   **When** the user dismisses it or it auto-hides after a timeout,
   **Then** the notification disappears without page reload.

4. **Given** the initial fetch error state is displayed,
   **When** the user clicks "Retry",
   **Then** the loading spinner appears (Story 2.9) and the fetch is re-attempted,
   **And** on success, the error state is replaced with the todo list.

5. **Given** an error state is displayed,
   **Then** the error content is accessible: the message is announced to screen readers,
   **And** the Retry button is keyboard-focusable and operable.

## Tasks / Subtasks

- [ ] Replace `alert()` for initial fetch failure with inline error state (AC: 1, 4, 5)
  - [ ] Add `error` state (`string | null`) to `page.tsx`
  - [ ] On fetch failure: set `error` message, clear `loading`
  - [ ] Render an error block with icon, message, and "Retry" button instead of `TodoList`
  - [ ] "Retry" button resets error state, sets loading, and re-calls `fetchTodos()`
  - [ ] Add `role="alert"` to the error container for screen reader announcement
- [ ] Replace `alert()` for mutation failures with toast notifications (AC: 2, 3)
  - [ ] Create a `Toast` / `Notification` component for inline error messages
  - [ ] Toast auto-dismisses after 5 seconds or user clicks dismiss (×)
  - [ ] Replace `alert('Unable to add todo...')` with toast
  - [ ] Replace `alert('Unable to update status')` with toast
  - [ ] Replace `alert('Unable to delete todo')` with toast
  - [ ] Replace `alert('Unable to update todo')` with toast
  - [ ] Existing rollback logic remains unchanged
- [ ] Accessibility for error states (AC: 5)
  - [ ] Fetch error container: `role="alert"` for assertive announcement
  - [ ] Toast: `role="status"` or `aria-live="polite"` for non-blocking announcement
  - [ ] Retry button: ensure keyboard focus and `aria-label`
- [ ] Update frontend unit tests (AC: 1, 2, 3, 4)
  - [ ] `page.test.tsx`: Replace `alert` spy tests with inline error state assertions
  - [ ] `page.test.tsx`: Verify error message, Retry button rendered on fetch failure
  - [ ] `page.test.tsx`: Verify clicking Retry re-fetches and shows loading state
  - [ ] `page.test.tsx`: Verify successful retry replaces error with todo list
  - [ ] `page.test.tsx`: Verify mutation failure shows toast notification (not alert)
  - [ ] `page.test.tsx`: Verify toast auto-dismisses or can be dismissed
  - [ ] `Toast.test.tsx`: Verify toast renders message, dismiss button, auto-hide
- [ ] Add e2e test for error/retry flow (AC: 1, 4)
  - [ ] Test is optional — requires simulating backend failure which is complex in e2e
  - [ ] If feasible: intercept API call to return error, verify error UI, click retry

## Dev Notes

### What Already Exists

All error handling currently uses `window.alert()`:

```tsx
// page.tsx — initial fetch failure
alert('Unable to load todos. Is the backend running?');

// page.tsx — create failure
alert('Unable to add todo. Is the backend running?');

// page.tsx — status update failure
alert('Unable to update status');

// page.tsx — delete failure
alert('Unable to delete todo');

// page.tsx — edit failure
alert('Unable to update todo');
```

Tests mock `window.alert` and assert it was called. These tests will need updating.

### Implementation — Error State in page.tsx

**File**: `frontend/app/page.tsx`

Add error state:

```tsx
const [error, setError] = useState<string | null>(null);
```

Replace the initial fetch error handler:

```tsx
useEffect(() => {
  loadTodos();
}, []);

const loadTodos = () => {
  setLoading(true);
  setError(null);
  fetchTodos()
    .then((list) => setTodos(list))
    .catch((err) => {
      console.error('failed to load todos', err);
      setError('Unable to load todos. Is the backend running?');
    })
    .finally(() => setLoading(false));
};
```

Update the render to show error state:

```tsx
{loading ? (
  <div className="mt-8 w-full flex justify-center" aria-busy="true">
    <Spinner label="Loading todos" />
  </div>
) : error ? (
  <div className="mt-8 w-full flex flex-col items-center py-12 text-center" role="alert" data-testid="error-state">
    <span className="text-4xl mb-3">⚠️</span>
    <p className="text-lg font-medium text-destructive">{error}</p>
    <button
      onClick={loadTodos}
      className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 cursor-pointer"
      aria-label="Retry loading todos"
    >
      Retry
    </button>
  </div>
) : (
  <TodoList ... />
)}
```

**CRITICAL**: Extract `fetchTodos()` call into a `loadTodos()` function so it can be called from both `useEffect` and the Retry button.

### Implementation — Toast Notification Component

**New file**: `frontend/app/components/Toast.tsx`

```tsx
'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number; // ms, default 5000
}

export default function Toast({
  message,
  onDismiss,
  duration = 5000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-3 rounded-md shadow-lg flex items-center gap-2 z-50"
      data-testid="toast"
    >
      <span className="text-sm">{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-2 text-sm font-bold hover:opacity-80 cursor-pointer"
      >
        ×
      </button>
    </div>
  );
}
```

### Implementation — Toast State in page.tsx

Add toast state and helpers:

```tsx
const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
let toastId = 0;

const showToast = (message: string) => {
  const id = ++toastId;
  setToasts((prev) => [...prev, { id, message }]);
};

const dismissToast = (id: number) => {
  setToasts((prev) => prev.filter((t) => t.id !== id));
};
```

Replace each `alert(...)` call with `showToast(...)`.

Render toasts at the bottom of the JSX:

```tsx
{
  toasts.map((t) => (
    <Toast
      key={t.id}
      message={t.message}
      onDismiss={() => dismissToast(t.id)}
    />
  ));
}
```

### No Backend Changes

Frontend-only story. All error handling changes are in `page.tsx` and new components.

### Testing Strategy

**Toast tests** (`frontend/tests/Toast.test.tsx` — new file):

- Renders message text
- Renders dismiss button with `aria-label`
- Calls `onDismiss` when dismiss button clicked
- Auto-dismisses after specified duration (use `vi.useFakeTimers()`)
- Has `role="status"` for accessibility

**Page tests** (`frontend/tests/page.test.tsx`):

- **UPDATE existing test** "alerts if initial fetch fails": Instead of checking `alert()`, verify inline error message + Retry button render
- **Add test**: Click Retry → `fetchTodos` called again → on success, error state replaced with todo list
- **Add test**: Click Retry → `fetchTodos` fails again → error state remains
- **UPDATE existing tests**: Replace all `alertSpy` assertions for mutation failures with toast assertions
- **Add test**: Toast auto-dismisses (use fake timers)
- **Add test**: Toast dismiss button removes it

**CRITICAL**: Remove or update all existing `vi.spyOn(window, 'alert')` patterns since `alert()` will no longer be called.

**E2E test** (`e2e/playwright-smoke.test.ts`):

- Optional: Simulating backend failure in e2e is complex. If implemented, use `page.route()` to intercept and fail the fetch, verify error UI appears, then unblock the route and click Retry.

### Anti-Patterns to Avoid

- Do NOT keep `alert()` calls — the whole point of this story is to replace them with inline UI
- Do NOT use a global error boundary for these cases — they are operation-specific errors
- Do NOT block the UI with a modal error dialog — use inline error state for fetch and toasts for mutations
- Do NOT remove existing optimistic rollback logic — it remains; only the user notification changes
- Do NOT make toasts permanent — they must auto-dismiss OR be manually dismissible
- Do NOT stack unlimited toasts — if needed, limit to 3 visible at once
- Do NOT forget to update ALL existing tests that spy on `window.alert` — they must be rewritten
- Do NOT use `waitForTimeout` in e2e tests

### Previous Story Intelligence

- **Stale closure**: Use `useRef` for `toastId` counter to avoid stale closure issues, or use `Date.now()` as ID
- **Test refactoring**: Multiple existing tests in `page.test.tsx` assert `alert()` calls. All of these need updating to assert toast rendering instead. This is the largest test change.
- **Pattern consistency**: The optimistic update + rollback pattern in all handlers remains unchanged. Only the notification mechanism changes from `alert()` to `showToast()`.
- **E2E**: Use `waitForFunction` or `waitForSelector` for deterministic waits.

### Project Structure Notes

- `frontend/app/components/Toast.tsx` — new file (toast notification component)
- `frontend/app/page.tsx` — modified (add error/toast state, replace alerts, extract loadTodos)
- `frontend/tests/Toast.test.tsx` — new file (toast tests)
- `frontend/tests/page.test.tsx` — modified (major: rewrite alert assertions → inline error/toast assertions)
- `frontend/tests/Home.test.tsx` — may need updating if it asserts alert behavior

### Dependencies

- **Story 2.9** (loading indicators): The retry flow should show the spinner from Story 2.9 while re-fetching. If 2.9 is not done yet, use the existing "Loading..." text fallback. The implementation should work either way since both render based on `loading` state.

### References

- [Source: \_bmad-output/planning-artifacts/epics.md#Story 2.10](epics.md) — acceptance criteria
- [Source: \_bmad-output/planning-artifacts/prd.md#Functional Requirements](prd.md) — FR10
- [Source: \_bmad-output/planning-artifacts/architecture.md#Frontend Architecture](architecture.md) — component patterns
- [Source: \_bmad-output/planning-artifacts/architecture.md#Accessibility Level](architecture.md) — WCAG 2.1 AA
- FR10: The interface displays an error state with retry options if an operation fails.
- FR11: User interactions are reflected instantly without a page reload.
- NFR8: WCAG 2.1 AA compliance.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
