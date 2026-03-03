# Story 4.3: Support state updates via single PATCH endpoint

Status: ready-for-dev

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

- [ ] Verify valid status transitions: `todo → in_progress`, `in_progress → done`, `done → todo` (AC: 1, 2, 3)
  - [ ] Confirm response body matches new status
  - [ ] Confirm `completedAt` lifecycle: null → set → null
- [ ] Verify invalid status rejected with 400 (AC: 4)
- [ ] Verify 404 for non-existent id (AC: 5)
- [ ] Verify 400 for empty PATCH body `{}` (AC: 6)
- [ ] Verify combined text + status PATCH works atomically (AC: 7)
- [ ] Add Vitest integration tests in `backend/test/todos.test.ts` labelled Story 4.3
  - [ ] All valid status transition combinations
  - [ ] `completedAt` null/set/cleared cycle
  - [ ] Combined text+status patch
- [ ] Maintain 90% coverage threshold

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

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
