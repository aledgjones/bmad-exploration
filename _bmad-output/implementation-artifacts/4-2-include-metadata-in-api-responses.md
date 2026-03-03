# Story 4.2: Include metadata in API responses

Status: ready-for-dev

## Story

As an API consumer,
I want each todo object to include creation time and status fields,
So that I can display rich information.

## Acceptance Criteria

1. **Given** there are todos in the database,
   **When** I `GET /todos`,
   **Then** each object in the array has a `createdAt` ISO-8601 timestamp and a `status` string field.

2. **Given** I create a todo via `POST /todos`,
   **When** the response is received,
   **Then** the response body includes `createdAt`, `updatedAt`, and `status` fields.

3. **Given** I update a todo via `PATCH /todos/:id`,
   **When** the response is received,
   **Then** the response body includes updated `updatedAt` and the correct `status` and/or `text`.

4. **Given** a todo was marked `done`,
   **When** I `GET /todos` or `PATCH /todos/:id` returns it,
   **Then** the `completedAt` field is a non-null ISO-8601 timestamp.

5. **Given** a todo is NOT in `done` status,
   **When** the response is received,
   **Then** `completedAt` is `null`.

## Tasks / Subtasks

- [ ] Verify `GET /todos` response objects include `createdAt` and `status` (AC: 1)
  - [ ] Confirm `createdAt` is an ISO-8601 formatted string (not null)
  - [ ] Confirm `status` is one of `todo | in_progress | done`
- [ ] Verify `POST /todos` response includes metadata fields (AC: 2)
  - [ ] `id`, `text`, `status`, `createdAt`, `updatedAt` all present
- [ ] Verify `PATCH /todos/:id` response includes updated metadata (AC: 3)
  - [ ] `updatedAt` changes after a PATCH
- [ ] Verify `completedAt` is set for `done` todos and null otherwise (AC: 4, 5)
  - [ ] POST → status `todo` → `completedAt` is null
  - [ ] PATCH to `done` → `completedAt` is non-null ISO timestamp
  - [ ] PATCH from `done` back to `todo` → `completedAt` is null again
- [ ] Add Vitest integration tests in `backend/test/todos.test.ts` labelled Story 4.2
- [ ] Maintain 90% coverage threshold

## Dev Notes

### What Already Exists — Primarily a Verification Story

All metadata fields are **already present** in the Prisma model and are returned unfiltered from Fastify routes. No serialiser or DTO layer strips fields. This story's job is to add explicit tests confirming metadata is in every response and behaves correctly.

**Prisma model fields** (all returned in API responses):

| Field         | Type          | Notes                                                                             |
| ------------- | ------------- | --------------------------------------------------------------------------------- |
| `id`          | `Int`         | Auto-increment primary key                                                        |
| `text`        | `String`      | Todo content                                                                      |
| `status`      | `Status` enum | `todo \| in_progress \| done`                                                     |
| `createdAt`   | `DateTime`    | Set on create, never changes                                                      |
| `updatedAt`   | `DateTime`    | Auto-updated by Prisma on every write (`@updatedAt`)                              |
| `completedAt` | `DateTime?`   | Set to `new Date()` when status → `done`; set to `null` when status leaves `done` |

**Key PATCH handler logic** (`backend/src/routes/todos.ts`):

```typescript
if (status === 'done') {
  updateData.completedAt = new Date();
} else {
  updateData.completedAt = null; // clear when moving out of done
}
```

**`GET /todos` ordering**: `orderBy: { createdAt: 'desc' }` — newest first.

### Critical Architecture Requirements

**Do NOT**:

- Add a DTO/serialiser layer that transforms field names (keep snake_case from Prisma)
- Filter or omit any fields from the Prisma response — external consumers need full metadata
- Change the `completedAt` null/non-null logic in the PATCH handler
- Add new fields to the Prisma schema (out of scope — no migration needed for this story)

**Backend stack** (do NOT deviate):

- **Fastify** — routes in `backend/src/routes/todos.ts`
- **Prisma** — returns all fields by default; no `select` clause should be added
- **TypeScript** — `.ts` files only
- **Vitest** — tests in `backend/test/todos.test.ts`

**Testing pattern** (append to existing test file):

```typescript
test('GET /todos items include createdAt and status metadata', async () => {
  await prisma.todo.create({ data: { text: 'meta-check', status: 'todo' } });
  const res = await server.inject({ method: 'GET', url: '/todos' });
  expect(res.statusCode).toBe(200);
  const list = res.json();
  expect(list.length).toBeGreaterThan(0);
  const item = list[0];
  expect(item).toHaveProperty('createdAt');
  expect(item).toHaveProperty('status');
  expect(item.completedAt).toBeNull();
  // ISO-8601 check
  expect(new Date(item.createdAt).toISOString()).toBe(item.createdAt);
});
```

**File locations** (do NOT create new files):

- Route logic: `backend/src/routes/todos.ts`
- Tests: `backend/test/todos.test.ts`
- Prisma schema: `backend/prisma/schema.prisma` (READ-ONLY for this story)

### References

- Route implementation: [backend/src/routes/todos.ts](backend/src/routes/todos.ts)
- Prisma schema: [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
- Existing tests (completedAt coverage): [backend/test/todos.test.ts](backend/test/todos.test.ts)
- Epic definition: [\_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md#L366) §Epic 4 / Story 4.2

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
