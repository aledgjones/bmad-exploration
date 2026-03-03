# Story 4.4: Ensure data consistency under concurrent requests

Status: ready-for-dev

## Story

As an API consumer,
I want the system to handle simultaneous updates correctly,
So that I don't encounter conflicts or lost updates.

## Acceptance Criteria

1. **Given** two clients attempt to update the same todo at the same time,
   **When** both PATCH requests are processed,
   **Then** the final state is deterministic (last-write-wins) and no data corrupts.

2. **Given** two clients attempt to update the same todo concurrently,
   **When** both requests complete,
   **Then** no 500 error is thrown by the service (each request returns 200 or a meaningful error).

3. **Given** a burst of concurrent `GET /todos` requests,
   **When** all requests complete,
   **Then** all return HTTP 200 with consistent data.

4. **Given** concurrent `POST /todos` requests,
   **When** all complete,
   **Then** each creates a distinct todo record (no duplicate suppression, no data corruption, each gets a unique `id`).

5. **Given** a race between a DELETE and a PATCH on the same todo,
   **When** both requests are processed,
   **Then** one returns a success (204 or 200) and the other returns 404, with no 500 errors.

## Tasks / Subtasks

- [ ] Analyse current Prisma + PostgreSQL transaction isolation for concurrent writes (AC: 1, 2)
  - [ ] Confirm PostgreSQL default isolation level (`READ COMMITTED`) provides last-write-wins semantics for independent column updates
  - [ ] Verify Prisma `update` is wrapped in an implicit transaction that prevents partial writes
- [ ] Add concurrent PATCH test: fire N simultaneous `PATCH /todos/:id` calls and assert last writer wins (AC: 1, 2)
  - [ ] Use `Promise.all` with `server.inject` calls
  - [ ] Verify final DB state is one of the submitted values (no corruption/null)
  - [ ] Verify no request returns a 500
- [ ] Add concurrent GET test: fire N simultaneous `GET /todos` calls and assert all return 200 (AC: 3)
- [ ] Add concurrent POST test: fire N simultaneous `POST /todos` calls and assert N unique records created (AC: 4)
- [ ] Add DELETE+PATCH race test: fire DELETE and PATCH concurrently, assert one 204/200 and one 404, no 500s (AC: 5)
- [ ] Evaluate whether `Prisma.$transaction` is needed for any multi-step operation exposed by this API
  - [ ] Current routes are single-statement — confirm no multi-step operations exist
  - [ ] If no multi-step operations, document explicitly in Dev Notes that Prisma implicit transactions are sufficient
- [ ] Maintain 90% coverage threshold

## Dev Notes

### Analysis: What Needs to Actually Be Done

The existing implementation uses **single-statement Prisma operations** for every route:

- `prisma.todo.create` — single INSERT
- `prisma.todo.findMany` — single SELECT
- `prisma.todo.update` — single UPDATE
- `prisma.todo.delete` — single DELETE

PostgreSQL wraps each statement in an implicit transaction at `READ COMMITTED` isolation level. This means:

- **Concurrent PATCHes** on the same row: last writer wins (the final UPDATE is applied atomically to the row)
- **Concurrent POSTs**: each INSERT is independent, each gets a unique auto-increment `id`
- **DELETE + PATCH race**: whichever reaches the DB first wins; the loser sees P2025 → 404

**No application-level locking or optimistic concurrency control is required** for the current feature set. The story is primarily about adding explicit tests proving this behaviour.

### If Locking IS Required (Advanced — Out of Scope for MVP)

If business requirements change to require versioned/optimistic concurrency:

1. Add a `version Int @default(0)` field to the Prisma `Todo` model
2. Generate and apply a new migration: `npx prisma migrate dev --name add-version`
3. In the PATCH handler, wrap in `prisma.$transaction` and apply `WHERE version = expectedVersion`

**Do NOT implement optimistic locking unless explicitly requested** — the AC says "last-write-wins" is acceptable.

### Critical Architecture Requirements

**Do NOT**:

- Add pessimistic row-locking (`SELECT FOR UPDATE`) — not needed for this use case
- Add a `version` or `etag` field without a follow-up migration — schema changes require new Prisma migrations
- Change the Prisma client configuration — the existing `@prisma/client` setup is correct
- Use raw SQL (`prisma.$queryRaw`) — use Prisma model methods
- Add connection pooling configuration — PgBouncer / external pooler is an infrastructure concern, out of scope

**Concurrency testing approach** (use `Promise.all` with `server.inject` — no external load-testing tools):

```typescript
test('concurrent PATCH requests result in deterministic state', async () => {
  const created = await prisma.todo.create({
    data: { text: 'race-target', status: 'todo' },
  });

  // fire 5 concurrent PATCH requests — mix of status values
  const responses = await Promise.all([
    server.inject({
      method: 'PATCH',
      url: `/todos/${created.id}`,
      payload: { status: 'in_progress' },
    }),
    server.inject({
      method: 'PATCH',
      url: `/todos/${created.id}`,
      payload: { status: 'done' },
    }),
    server.inject({
      method: 'PATCH',
      url: `/todos/${created.id}`,
      payload: { status: 'todo' },
    }),
    server.inject({
      method: 'PATCH',
      url: `/todos/${created.id}`,
      payload: { status: 'in_progress' },
    }),
    server.inject({
      method: 'PATCH',
      url: `/todos/${created.id}`,
      payload: { status: 'done' },
    }),
  ]);

  // all requests must succeed (no 500s)
  expect(responses.every((r) => r.statusCode === 200)).toBe(true);

  // final state must be one of the submitted values (last-write-wins)
  const fromDb = await prisma.todo.findUnique({ where: { id: created.id } });
  expect(['todo', 'in_progress', 'done']).toContain(fromDb?.status);
  // no null/undefined — never corrupted
  expect(fromDb?.status).toBeDefined();
});
```

**Backend stack** (do NOT deviate):

- **Fastify** — `backend/src/routes/todos.ts` (likely READ-ONLY for this story)
- **Prisma** — single-statement operations are sufficient; `$transaction` only if multi-step logic is added
- **TypeScript** — `.ts` only
- **Vitest** + **testcontainers** — tests in `backend/test/todos.test.ts`; `Promise.all` for concurrency

**File locations**:

- Route: `backend/src/routes/todos.ts` (likely READ-ONLY)
- Tests: `backend/test/todos.test.ts` (append concurrency tests — labelled Story 4.4)
- Prisma schema: `backend/prisma/schema.prisma` (READ-ONLY unless version field approved)

### References

- Route implementation: [backend/src/routes/todos.ts](backend/src/routes/todos.ts)
- Prisma schema: [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
- Existing tests: [backend/test/todos.test.ts](backend/test/todos.test.ts)
- Architecture: [\_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md)
- Epic definition: [\_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md#L366) §Epic 4 / Story 4.4

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
