# Story 4.1: Provide CRUD endpoints for todos

Status: ready-for-dev

## Story

As an external developer,
I want RESTful endpoints to create, read, update, and delete todos,
So that I can integrate the service into another application.

## Acceptance Criteria

1. **Given** the backend is running,
   **When** I send `POST /todos` with `{ "text": "my task" }`,
   **Then** the server returns HTTP 201 with a JSON todo object containing `id`, `text`, `status`, `createdAt`.

2. **Given** the backend is running,
   **When** I send `GET /todos`,
   **Then** the server returns HTTP 200 with a JSON array of todo objects.

3. **Given** a todo exists with a known `id`,
   **When** I send `PATCH /todos/:id` with `{ "status": "in_progress" }`,
   **Then** the server returns HTTP 200 with the updated todo object.

4. **Given** a todo exists with a known `id`,
   **When** I send `DELETE /todos/:id`,
   **Then** the server returns HTTP 204 with no body.

5. **Given** an invalid or non-existent `id`,
   **When** I send `PATCH /todos/:id` or `DELETE /todos/:id`,
   **Then** the server returns HTTP 404 with `{ "error": "todo not found" }`.

6. **Given** a request with invalid body (e.g. missing `text` on POST),
   **When** the request is processed,
   **Then** the server returns HTTP 400 with an informative error.

## Tasks / Subtasks

- [ ] Verify `POST /todos` returns 201 + full todo JSON (AC: 1)
  - [ ] Confirm response includes `id`, `text`, `status`, `createdAt`, `updatedAt`
  - [ ] Confirm `Content-Type: application/json` header is present
- [ ] Verify `GET /todos` returns 200 + JSON array (AC: 2)
  - [ ] Confirm empty array returned when no todos exist
  - [ ] Confirm array ordered by `createdAt desc`
- [ ] Verify `PATCH /todos/:id` returns 200 + updated object (AC: 3)
  - [ ] Confirm status and text can be updated independently
  - [ ] Confirm both can be updated in a single call
- [ ] Verify `DELETE /todos/:id` returns 204 + empty body (AC: 4)
- [ ] Verify 404 for missing resource on PATCH and DELETE (AC: 5)
- [ ] Verify 400 for bad request bodies (AC: 6)
  - [ ] POST without `text`
  - [ ] POST with whitespace-only `text`
  - [ ] PATCH with body `{}`
  - [ ] PATCH/DELETE with non-numeric `:id`
- [ ] Add/confirm Vitest integration tests in `backend/test/todos.test.ts` explicitly labelled as Story 4.1 API compliance tests
- [ ] Maintain 90% coverage threshold

## Dev Notes

### What Already Exists — Primarily a Verification + API-compliance Story

All four CRUD endpoints are **already implemented** in `backend/src/routes/todos.ts`. The routes are registered via `backend/src/app.ts`. This story validates them from the perspective of an **external API consumer** and ensures they meet HTTP/REST conventions used by integration clients.

**Existing endpoints** (`backend/src/routes/todos.ts`):

| Method | Route        | Handler                | HTTP Response  |
| ------ | ------------ | ---------------------- | -------------- |
| POST   | `/todos`     | `prisma.todo.create`   | 201 JSON       |
| GET    | `/todos`     | `prisma.todo.findMany` | 200 JSON array |
| PATCH  | `/todos/:id` | `prisma.todo.update`   | 200 JSON       |
| DELETE | `/todos/:id` | `prisma.todo.delete`   | 204 empty      |

**Prisma model** (`backend/prisma/schema.prisma`):

```prisma
model Todo {
  id          Int       @id @default(autoincrement())
  text        String
  status      Status    @default(todo)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  completedAt DateTime?
}

enum Status {
  todo
  in_progress
  done
}
```

**Validation already in place**:

- POST: `body.text` required, `minLength: 1`; whitespace trim check in handler → 400
- PATCH: `anyOf: [{ required: ['status'] }, { required: ['text'] }]`; status must be `todo | in_progress | done`
- PATCH/DELETE: `id` parsed as `Number`, returns 400 for NaN, 404 for Prisma P2025

### Critical Architecture Requirements

**Do NOT**:

- Switch from Fastify to Express or any other framework
- Replace Prisma with raw SQL or another ORM
- Add authentication/authorisation — out of scope for this epic
- Change the status enum values — they are `todo`, `in_progress`, `done` (NOT `"To Do"`, `"In Progress"`, `"Done"`)
- Change HTTP status codes already established (201 for create, 204 for delete, 404 for not-found)

**Backend stack** (do NOT deviate):

- **Fastify** `src/routes/todos.ts` is the route file — do NOT create a new route file
- **Prisma** with PostgreSQL — `prisma.todo.*` for all DB operations
- **TypeScript** — all new files must be `.ts`
- **Vitest** for unit/integration tests — tests go in `backend/test/todos.test.ts`
- **testcontainers** (`PostgreSqlContainer`) for integration tests that need a real DB

**Testing pattern** (from existing tests in `backend/test/todos.test.ts`):

```typescript
// Shared server + testcontainer setup — do NOT create a new beforeAll block
// Append new tests to the existing test file

test('POST /todos returns 201 with full todo object', async () => {
  const response = await server.inject({
    method: 'POST',
    url: '/todos',
    payload: { text: 'integration task' },
  });
  expect(response.statusCode).toBe(201);
  const body = response.json();
  expect(body).toHaveProperty('id');
  expect(body).toHaveProperty('createdAt');
  expect(body).toHaveProperty('updatedAt');
  expect(body.status).toBe('todo');
});
```

**File locations** (do NOT create new files unless absolutely necessary):

- Route logic: `backend/src/routes/todos.ts`
- Tests: `backend/test/todos.test.ts`

### References

- Route implementation: [backend/src/routes/todos.ts](backend/src/routes/todos.ts)
- Prisma schema: [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
- Existing tests: [backend/test/todos.test.ts](backend/test/todos.test.ts)
- Epic definition: [\_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md#L366) §Epic 4 / Story 4.1

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
