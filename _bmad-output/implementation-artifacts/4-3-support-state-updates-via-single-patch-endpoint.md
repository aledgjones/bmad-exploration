# Story 4.3: Support state updates via single PATCH endpoint

Status: review

## Story

As an API consumer,
I want to change a todo's state by patching a single endpoint,
So that state transitions are simple.

## Acceptance Criteria

1. **Given** a todo exists,
   **When** I send `PATCH /todos/:id` with `{ "status": "in_progress" }`,
   **Then** the todo's status updates and the response reflects `status: "in_progress"`.

2. **Given** a todo exists,
   **When** I send `PATCH /todos/:id` with `{ "status": "done" }`,
   **Then** the response reflects `status: "done"` and `completedAt` is a non-null timestamp.

3. **Given** a todo is in `done` status,
   **When** I send `PATCH /todos/:id` with `{ "status": "todo" }`,
   **Then** the response reflects `status: "todo"` and `completedAt` is `null`.

4. **Given** a todo exists,
   **When** I send `PATCH /todos/:id` with a status not in `["todo", "in_progress", "done"]`,
   **Then** the server returns HTTP 400.

5. **Given** a non-existent todo id,
   **When** I send `PATCH /todos/:id` with a valid body,
   **Then** the server returns HTTP 404 with `{ "error": "todo not found" }`.

6. **Given** a todo exists,
   **When** I send `PATCH /todos/:id` with `{}` (empty body),
   **Then** the server returns HTTP 400.

7. **Given** a todo exists,
   **When** I send `PATCH /todos/:id` with both `text` and `status` in the body,
   **Then** both fields are updated in a single database write and the response reflects both changes.

## Tasks / Subtasks

- [x] Verify valid status transitions: `todo → in_progress`, `in_progress → done`, `done → todo` (AC: 1, 2, 3)
  - [x] Confirm response body matches new status
  - [x] Confirm `completedAt` lifecycle: null → set → null
- [x] Verify invalid status rejected with 400 (AC: 4)
- [x] Verify 404 for non-existent id (AC: 5)
- [x] Verify 400 for empty PATCH body `{}` (AC: 6)
- [x] Verify combined text + status PATCH works atomically (AC: 7)
- [x] Add Vitest integration tests in `backend/test/todos.test.ts` labelled Story 4.3
  - [x] All valid status transition combinations
  - [x] `completedAt` null/set/cleared cycle
  - [x] Combined text+status patch
- [x] Maintain 90% coverage threshold

## Dev Notes

### What Already Exists — Primarily a Verification + gaps Story

The PATCH endpoint is **fully implemented** in `backend/src/routes/todos.ts`. This story verifies it meets the single-endpoint state-machine contract for external consumers, and ensures all transition scenarios are explicitly tested.

**Existing PATCH handler logic** (`backend/src/routes/todos.ts`):

```typescript
fastify.patch(
  '/todos/:id',
  {
    schema: {
      params: { properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
          text: { type: 'string', minLength: 1 },
        },
        anyOf: [{ required: ['status'] }, { required: ['text'] }],
      },
    },
  },
  async (request, reply) => {
    // ...
    if (status === 'done') {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null; // clears on transition away from done
    }
    // ...P2025 → 404, other errors rethrown
  },
);
```

**Status state machine**:

```
     ┌──────────────────────────────────────┐
     ▼                                      │
  [todo] ──PATCH status──► [in_progress] ──PATCH status──► [done]
     ▲                          │                            │
     └──────────────────────────┴────────────────────────────┘
                         (any → any via PATCH)
```

All transitions are permitted — there are no enforced state-machine guards beyond the enum validation. Any status value can be patched to any other status value.

**Enum values** (database and API):

- `"todo"` — initial state
- `"in_progress"` — active work
- `"done"` — completed (sets `completedAt`)

⚠️ **IMPORTANT**: The API uses snake_case `in_progress` (NOT `"In Progress"` or `"inProgress"`). The frontend maps display labels separately.

**Missing test coverage to add** (not yet in `todos.test.ts`):

- Full state-machine cycle: `todo → in_progress → done → todo` in a single test
- Explicit check that `completedAt` clears when transitioning from `done` to `in_progress` (not just `done → todo`)

### Critical Architecture Requirements

**Do NOT**:

- Add state-machine guards that reject certain transitions — all transitions are valid
- Add new status values to the enum without a Prisma migration
- Create a separate endpoint for status updates — the single `PATCH /todos/:id` handles both `status` and `text`
- Change the `completedAt` logic — it must be set to `new Date()` for `done` and `null` for all other statuses

**Backend stack** (do NOT deviate):

- **Fastify** — `backend/src/routes/todos.ts`
- **Prisma** — `prisma.todo.update` for all mutations
- **TypeScript** — `.ts` files only
- **Vitest** + **testcontainers** — tests in `backend/test/todos.test.ts`

**File locations**:

- Route: `backend/src/routes/todos.ts` (READ-ONLY — no logic changes needed)
- Tests: `backend/test/todos.test.ts` (append new tests)

### References

- Route implementation: [backend/src/routes/todos.ts](backend/src/routes/todos.ts)
- Prisma schema: [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
- Existing PATCH tests: [backend/test/todos.test.ts](backend/test/todos.test.ts)
- Epic definition: [\_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md#L366) §Epic 4 / Story 4.3

## Change Log

| Date       | Change                                                                                                                        | Author             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 2026-03-03 | Added 9 Story 4.3 Vitest integration tests covering all ACs; full state-machine cycle; done→in_progress completedAt clear gap | Amelia (Dev Agent) |

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

_None — clean implementation, no debugging needed._

### Completion Notes List

- Confirmed `PATCH /todos/:id` route in `backend/src/routes/todos.ts` is fully implemented; no route changes required.
- Appended 9 Story 4.3-labelled Vitest integration tests to `backend/test/todos.test.ts`:
  - `[Story 4.3 AC1]` todo→in_progress reflects status in response
  - `[Story 4.3 AC2]` todo→done sets completedAt to non-null ISO timestamp
  - `[Story 4.3 AC3]` done→todo clears completedAt to null
  - `[Story 4.3 AC4]` invalid status enum value returns 400
  - `[Story 4.3 AC5]` non-existent id returns 404 with `{ error: 'todo not found' }`
  - `[Story 4.3 AC6]` empty body `{}` returns 400
  - `[Story 4.3 AC7]` combined text+status patch is atomic and reflects both fields
  - `[Story 4.3]` full state-machine cycle: todo→in_progress→done→todo with completedAt lifecycle
  - `[Story 4.3]` done→in_progress clears completedAt (gap noted in Dev Notes)
- All 58 tests pass (0 failures, 0 regressions); combined frontend+backend coverage = 93.07% (threshold 90% ✅).

### File List

- `backend/test/todos.test.ts` — appended 9 Story 4.3 integration tests
