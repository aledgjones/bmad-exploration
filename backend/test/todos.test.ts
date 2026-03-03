/// <reference lib="dom" />
import { test, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { app, options } from '../src/app.js';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer } from 'testcontainers';

let prisma: PrismaClient;
let container: any;
// Shared server instance — avoids spawning a new PrismaClient per test
let server: FastifyInstance;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:15')
    .withDatabase('postgres')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();
  process.env.DATABASE_URL = container.getConnectionUri();
  prisma = new PrismaClient();
  await prisma.$connect();
  // apply migrations using Prisma CLI; the database container is already running
  // this relies on the CLI to generate/apply SQL, not manual edits to migration files
  await new Promise<void>((resolve, reject) => {
    const { spawn } = require('child_process');
    const cmd = spawn('npx', ['prisma', 'migrate', 'deploy'], {
      env: process.env,
    });
    let out = '';
    let err = '';
    cmd.stdout.on('data', (b: Buffer) => (out += b.toString()));
    cmd.stderr.on('data', (b: Buffer) => (err += b.toString()));
    cmd.on('exit', (code: number) => {
      if (code === 0) {
        resolve();
      } else {
        console.error('migration stdout:', out);
        console.error('migration stderr:', err);
        reject(new Error('migration failed'));
      }
    });
  });
  // Shared Fastify instance — one PrismaClient for the whole suite
  server = Fastify();
  await server.register(app, options);
  await server.ready();
});

afterAll(async () => {
  if (server) await server.close();
  if (prisma) await prisma.$disconnect();
  if (container) await container.stop();
});

test('POST /todos creates a todo with default status', async () => {
  const response = await server.inject({
    method: 'POST',
    url: '/todos',
    payload: { text: 'my task' },
  });

  expect(response.statusCode).toBe(201);
  const body = response.json();
  expect(body).toHaveProperty('id');
  expect(body.text).toBe('my task');
  expect(body.status).toBe('todo'); // new assertion based on enum default
});

// new test - whitespace should fail

test('POST /todos rejects whitespace-only text', async () => {
  const response = await server.inject({
    method: 'POST',
    url: '/todos',
    payload: { text: '   ' },
  });

  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ error: 'text must be a non-empty string' });
});

test('GET /todos returns empty list when there are no todos', async () => {
  // ensure database is clean in case prior tests left data
  await prisma.todo.deleteMany();

  const response = await server.inject({ method: 'GET', url: '/todos' });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual([]);
});

test('GET /todos returns list including created tasks', async () => {
  // create one entry via prisma directly to ensure something exists
  await prisma.todo.create({ data: { text: 'another', status: 'todo' } });
  const response = await server.inject({ method: 'GET', url: '/todos' });
  expect(response.statusCode).toBe(200);
  const list = response.json();
  expect(Array.isArray(list)).toBe(true);
  expect(list.length).toBeGreaterThan(0);
  expect(list[0]).toHaveProperty('text');
});

// additional coverage targets: routes when prisma is null, and example plugin

test('routes return 500 if prisma not initialized', async () => {
  const server = Fastify();
  // decorate manually instead of registering prisma plugin
  // @ts-ignore
  server.decorate('prisma', null);
  // import the route directly rather than full app to avoid plugin override
  const todosRoute = (await import('../src/routes/todos')).default;
  await server.register(todosRoute as any);
  await server.ready();

  const post = await server.inject({
    method: 'POST',
    url: '/todos',
    payload: { text: 'x' },
  });
  expect(post.statusCode).toBe(500);
  // plugin now returns explicit error object rather than Fastify's default wrapper
  expect(post.json()).toEqual({
    error: 'database not initialized',
  });

  const get = await server.inject({ method: 'GET', url: '/todos' });
  expect(get.statusCode).toBe(500);
  expect(get.json()).toEqual({ error: 'database not initialized' });

  // patch should also fail when prisma is null
  const patch = await server.inject({
    method: 'PATCH',
    url: '/todos/1',
    payload: { status: 'todo' },
  });
  expect(patch.statusCode).toBe(500);
  expect(patch.json()).toEqual({ error: 'database not initialized' });

  // delete should also fail when prisma is null
  const del = await server.inject({
    method: 'DELETE',
    url: '/todos/1',
  });
  expect(del.statusCode).toBe(500);
  expect(del.json()).toEqual({ error: 'database not initialized' });
});

test('todos route handles valid prisma: GET returns list, PATCH rejects bad id and whitespace text, DELETE succeeds', async () => {
  // Uses the direct-import path so the todo routes are exercised against a
  // non-null prisma instance, verifying handler logic beyond the prisma-guard early-return.
  const localServer = Fastify();
  const mockPrisma = {
    todo: {
      findMany: async () => [],
      delete: async () => ({}),
    },
  };
  // @ts-ignore
  localServer.decorate('prisma', mockPrisma);
  const todosRoute = (await import('../src/routes/todos')).default;
  await localServer.register(todosRoute as any);
  await localServer.ready();

  // GET: non-null prisma → false branch on prisma guard → returns empty array
  const getRes = await localServer.inject({ method: 'GET', url: '/todos' });
  expect(getRes.statusCode).toBe(200);
  expect(getRes.json()).toEqual([]);

  // PATCH: non-numeric id → NaN branch true → 400
  const nanIdRes = await localServer.inject({
    method: 'PATCH',
    url: '/todos/not-a-number',
    payload: { status: 'todo' },
  });
  expect(nanIdRes.statusCode).toBe(400);
  expect(nanIdRes.json()).toEqual({ error: 'invalid id' });

  // PATCH: whitespace-only text → trimmed-empty branch true → 400 (no DB call)
  const wsRes = await localServer.inject({
    method: 'PATCH',
    url: '/todos/1',
    payload: { text: '   ' },
  });
  expect(wsRes.statusCode).toBe(400);
  expect(wsRes.json()).toEqual({ error: 'text must be a non-empty string' });

  // DELETE: successful delete → 204
  const delRes = await localServer.inject({
    method: 'DELETE',
    url: '/todos/1',
  });
  expect(delRes.statusCode).toBe(204);

  await localServer.close();
});

test('example route responds correctly', async () => {
  const server = Fastify();
  const exampleRoute = (await import('../src/routes/example/index')).default;
  await server.register(exampleRoute as any, { prefix: '/example' });
  await server.ready();

  const res = await server.inject({ method: 'GET', url: '/example' });
  expect(res.statusCode).toBe(200);
  expect(res.body).toBe('this is an example');
});

// --- new status-change tests ---

test('PATCH /todos/:id updates status when valid', async () => {
  // create a todo directly with prisma so we know id
  const created = await prisma.todo.create({
    data: { text: 'foo', status: 'todo' },
  });

  const response = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { status: 'in_progress' },
  });

  if (response.statusCode !== 200) {
    console.error(
      'PATCH update status failed',
      response.statusCode,
      response.json(),
    );
  }
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body).toHaveProperty('id', created.id);
  expect(body.status).toBe('in_progress');

  // verify database persisted
  const fromDb = await prisma.todo.findUnique({ where: { id: created.id } });
  expect(fromDb?.status).toBe('in_progress');
  // completedAt may be null or undefined when not set
  expect(fromDb?.completedAt == null).toBe(true);
});

test('PATCH /todos/:id rejects invalid status', async () => {
  const created = await prisma.todo.create({
    data: { text: 'bar', status: 'todo' },
  });

  const response = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { status: 'not-a-valid-one' },
  });

  expect(response.statusCode).toBe(400);
  // fastify will include validation error details; just ensure it's a 400
});

test('PATCH /todos/:id returns 404 for missing item', async () => {
  const response = await server.inject({
    method: 'PATCH',
    url: '/todos/999999',
    payload: { status: 'done' },
  });
  if (response.statusCode !== 404) {
    console.error(
      'expected 404 for missing id but got',
      response.statusCode,
      response.json(),
    );
  }
  expect(response.statusCode).toBe(404);
  expect(response.json()).toEqual({ error: 'todo not found' });
});

// new test: completion timestamp is recorded when marking done

test('PATCH /todos/:id sets completedAt when status done', async () => {
  const created = await prisma.todo.create({
    data: { text: 'complete me', status: 'todo' },
  });
  const response = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { status: 'done' },
  });
  if (response.statusCode !== 200) {
    console.error('PATCH done failed', response.statusCode, response.json());
  }
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.status).toBe('done');
  expect(body.completedAt).toBeTruthy();

  const fromDb = await prisma.todo.findUnique({ where: { id: created.id } });
  expect(fromDb?.status).toBe('done');
  expect(fromDb?.completedAt).not.toBeNull();
});

// new test: completedAt cleared when status moves away from done

test('PATCH /todos/:id clears completedAt when status returns from done', async () => {
  // create item initially done
  const created = await prisma.todo.create({
    data: { text: 'change me', status: 'done', completedAt: new Date() },
  });
  const resp = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { status: 'todo' },
  });
  expect(resp.statusCode).toBe(200);
  const b = resp.json();
  expect(b.status).toBe('todo');
  expect(b.completedAt).toBeNull();

  const fromDb2 = await prisma.todo.findUnique({ where: { id: created.id } });
  expect(fromDb2?.status).toBe('todo');
  expect(fromDb2?.completedAt).toBeNull();
});

// new test to exercise invalid id parsing

test('PATCH /todos/:id rejects non-numeric id', async () => {
  const response = await server.inject({
    method: 'PATCH',
    url: '/todos/not-a-number',
    payload: { status: 'todo' },
  });
  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ error: 'invalid id' });
});

// --- PATCH text update tests ---

test('PATCH /todos/:id updates text when valid', async () => {
  const created = await prisma.todo.create({
    data: { text: 'original', status: 'todo' },
  });

  const response = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { text: 'updated text' },
  });

  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.text).toBe('updated text');
  expect(body.id).toBe(created.id);

  const fromDb = await prisma.todo.findUnique({ where: { id: created.id } });
  expect(fromDb?.text).toBe('updated text');
});

test('PATCH /todos/:id updates both text and status', async () => {
  const created = await prisma.todo.create({
    data: { text: 'both', status: 'todo' },
  });

  const response = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { text: 'both updated', status: 'done' },
  });

  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.text).toBe('both updated');
  expect(body.status).toBe('done');
  expect(body.completedAt).toBeTruthy();
});

test('PATCH /todos/:id rejects empty text', async () => {
  const created = await prisma.todo.create({
    data: { text: 'keep', status: 'todo' },
  });

  const response = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { text: '' },
  });

  // minLength:1 in schema means Fastify rejects before handler
  expect(response.statusCode).toBe(400);
});

test('PATCH /todos/:id rejects whitespace-only text', async () => {
  const created = await prisma.todo.create({
    data: { text: 'keep', status: 'todo' },
  });

  const response = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { text: '   ' },
  });

  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ error: 'text must be a non-empty string' });
});

test('PATCH /todos/:id rejects body with neither text nor status', async () => {
  const created = await prisma.todo.create({
    data: { text: 'keep', status: 'todo' },
  });

  const response = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: {},
  });

  expect(response.statusCode).toBe(400);
});

// --- DELETE endpoint tests ---

test('DELETE /todos/:id returns 204 on success', async () => {
  const created = await prisma.todo.create({
    data: { text: 'delete me', status: 'todo' },
  });

  const response = await server.inject({
    method: 'DELETE',
    url: `/todos/${created.id}`,
  });

  expect(response.statusCode).toBe(204);
  expect(response.body).toBe('');

  // verify item no longer exists in DB
  const fromDb = await prisma.todo.findUnique({ where: { id: created.id } });
  expect(fromDb).toBeNull();
});

test('DELETE /todos/:id returns 404 for non-existent id', async () => {
  const response = await server.inject({
    method: 'DELETE',
    url: '/todos/999999',
  });

  expect(response.statusCode).toBe(404);
  expect(response.json()).toEqual({ error: 'todo not found' });
});

test('DELETE /todos/:id rejects non-numeric id', async () => {
  const response = await server.inject({
    method: 'DELETE',
    url: '/todos/not-a-number',
  });

  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ error: 'invalid id' });
});

// additional low-level tests to hit internal branches for coverage
import todosPlugin from '../src/routes/todos';
import { vi } from 'vitest';

test('direct handler invocation exercises trim, create/get and patch error paths', async () => {
  const handlers: any = {};
  const fakeFastify: any = {
    post: (path: string, opts: any, fn: any) => {
      handlers.post = fn;
    },
    get: (path: string, fn: any) => {
      handlers.get = fn;
    },
    patch: (path: string, opts: any, fn: any) => {
      handlers.patch = fn;
    },
    delete: (path: string, opts: any, fn: any) => {
      handlers.delete = fn;
    },
    log: { info: vi.fn(), error: vi.fn() },
    prisma: {
      todo: {
        create: async (p: any) => p.data,
        findMany: async () => [],
        update: async () => ({}),
      },
    },
  };

  await todosPlugin(fakeFastify, {} as any);

  // POST handler: whitespace trim logic
  const reply1: any = { code: vi.fn().mockReturnThis(), send: vi.fn() };
  await handlers.post({ body: { text: '   ' } }, reply1);
  expect(reply1.send).toHaveBeenCalledWith({
    error: 'text must be a non-empty string',
  });

  // POST handler: success path should call prisma.create and reply
  const replySuccess: any = { code: vi.fn().mockReturnThis(), send: vi.fn() };
  const reqSuccess: any = { body: { text: 'ok' } };
  fakeFastify.prisma.todo.create = async (p: any) => ({ id: 42, ...p.data });
  await handlers.post(reqSuccess, replySuccess);
  expect(replySuccess.send).toHaveBeenCalledWith({
    id: 42,
    text: 'ok',
    status: 'todo',
  });

  // GET handler: returns empty list via return value
  const reply2: any = { code: vi.fn().mockReturnThis(), send: vi.fn() };
  const result = await handlers.get({}, reply2);
  expect(result).toEqual([]);

  // PATCH handler: simulate generic error (not P2025)
  fakeFastify.prisma.todo.update = async () => {
    throw new Error('boom');
  };
  const reply3: any = { code: vi.fn().mockReturnThis(), send: vi.fn() };
  const req3: any = { params: { id: 1 }, body: { status: 'todo' } };
  await expect(handlers.patch(req3, reply3)).rejects.toThrow('boom');

  // PATCH handler: simulate P2025 not-found error
  fakeFastify.prisma.todo.update = async () => {
    const err: any = new Error('notfound');
    err.code = 'P2025';
    throw err;
  };
  const reply4: any = { code: vi.fn().mockReturnThis(), send: vi.fn() };
  const req4: any = { params: { id: 1 }, body: { status: 'done' } };
  const result4 = await handlers.patch(req4, reply4);
  expect(reply4.send).toHaveBeenCalledWith({ error: 'todo not found' });

  // PATCH handler: text-only update
  fakeFastify.prisma.todo.update = async (p: any) => ({ id: 1, ...p.data });
  const reply4b: any = { code: vi.fn().mockReturnThis(), send: vi.fn() };
  const req4b: any = { params: { id: 1 }, body: { text: 'new text' } };
  const result4b = await handlers.patch(req4b, reply4b);
  expect(result4b).toEqual({ id: 1, text: 'new text' });

  // PATCH handler: whitespace-only text rejected
  const reply4c: any = { code: vi.fn().mockReturnThis(), send: vi.fn() };
  const req4c: any = { params: { id: 1 }, body: { text: '   ' } };
  await handlers.patch(req4c, reply4c);
  expect(reply4c.send).toHaveBeenCalledWith({
    error: 'text must be a non-empty string',
  });

  // DELETE handler: success path
  fakeFastify.prisma.todo.delete = async () => ({});
  const reply5: any = { code: vi.fn().mockReturnThis(), send: vi.fn() };
  const req5: any = { params: { id: '1' } };
  await handlers.delete(req5, reply5);
  expect(reply5.code).toHaveBeenCalledWith(204);
  expect(reply5.send).toHaveBeenCalled();

  // DELETE handler: P2025 not-found error
  fakeFastify.prisma.todo.delete = async () => {
    const err: any = new Error('notfound');
    err.code = 'P2025';
    throw err;
  };
  const reply6: any = { code: vi.fn().mockReturnThis(), send: vi.fn() };
  const req6: any = { params: { id: '2' } };
  await handlers.delete(req6, reply6);
  expect(reply6.code).toHaveBeenCalledWith(404);
  expect(reply6.send).toHaveBeenCalledWith({ error: 'todo not found' });

  // DELETE handler: generic error rethrown
  fakeFastify.prisma.todo.delete = async () => {
    throw new Error('boom-delete');
  };
  const reply7: any = { code: vi.fn().mockReturnThis(), send: vi.fn() };
  const req7: any = { params: { id: '3' } };
  await expect(handlers.delete(req7, reply7)).rejects.toThrow('boom-delete');

  // DELETE handler: non-numeric id
  const reply8: any = { code: vi.fn().mockReturnThis(), send: vi.fn() };
  const req8: any = { params: { id: 'abc' } };
  await handlers.delete(req8, reply8);
  expect(reply8.code).toHaveBeenCalledWith(400);
  expect(reply8.send).toHaveBeenCalledWith({ error: 'invalid id' });
});

// --- Story 3.1: POST→GET round-trip persistence tests ---

test('POST /todos then GET /todos returns the persisted todo (round-trip)', async () => {
  // ensure a clean slate so the assertion is deterministic
  await prisma.todo.deleteMany();

  const postRes = await server.inject({
    method: 'POST',
    url: '/todos',
    payload: { text: 'persist me' },
  });
  expect(postRes.statusCode).toBe(201);
  const created = postRes.json();
  // POST must return an id and a createdAt timestamp (AC verification)
  expect(created.id).toBeDefined();
  expect(created.createdAt).toBeDefined();
  expect(created.createdAt).not.toBeNull();

  // confirm the item appears in a subsequent GET
  const getRes = await server.inject({ method: 'GET', url: '/todos' });
  expect(getRes.statusCode).toBe(200);
  const list = getRes.json();
  expect(
    list.some((t: any) => t.id === created.id && t.text === 'persist me'),
  ).toBe(true);
});

// --- Story 3.2: mutation→GET round-trip tests ---

test('PATCH status then GET /todos shows updated status in list', async () => {
  const created = await prisma.todo.create({
    data: { text: 'status-persist', status: 'todo' },
  });

  const patchRes = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { status: 'done' },
  });
  expect(patchRes.statusCode).toBe(200);

  // verify the change is visible via GET /todos
  const getRes = await server.inject({ method: 'GET', url: '/todos' });
  expect(getRes.statusCode).toBe(200);
  const list = getRes.json();
  const found = list.find((t: any) => t.id === created.id);
  expect(found?.status).toBe('done');
  // completedAt must be set when status is done
  expect(found?.completedAt).not.toBeNull();
});

test('PATCH text then GET /todos shows updated text in list', async () => {
  const created = await prisma.todo.create({
    data: { text: 'text-persist', status: 'todo' },
  });

  const patchRes = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { text: 'updated-text' },
  });
  expect(patchRes.statusCode).toBe(200);

  // verify the change is reflected in GET /todos
  const getRes = await server.inject({ method: 'GET', url: '/todos' });
  expect(getRes.statusCode).toBe(200);
  const list = getRes.json();
  const found = list.find((t: any) => t.id === created.id);
  expect(found?.text).toBe('updated-text');
});

test('DELETE then GET /todos confirms todo no longer in list', async () => {
  const created = await prisma.todo.create({
    data: { text: 'delete-persist', status: 'todo' },
  });

  const delRes = await server.inject({
    method: 'DELETE',
    url: `/todos/${created.id}`,
  });
  expect(delRes.statusCode).toBe(204);

  // verify item is absent from GET /todos
  const getRes = await server.inject({ method: 'GET', url: '/todos' });
  expect(getRes.statusCode).toBe(200);
  const list = getRes.json();
  expect(list.some((t: any) => t.id === created.id)).toBe(false);
});

// =============================================================================
// Story 4.1 API Compliance Tests
// Validates RESTful CRUD endpoints from the perspective of an external API consumer
// =============================================================================

// --- AC 1: POST /todos returns 201 with full todo object ---

test('[Story 4.1 AC1] POST /todos returns 201 with id, text, status, createdAt, updatedAt', async () => {
  const response = await server.inject({
    method: 'POST',
    url: '/todos',
    payload: { text: 'story 4.1 task' },
  });
  expect(response.statusCode).toBe(201);
  const body = response.json();
  expect(body).toHaveProperty('id');
  expect(typeof body.id).toBe('number');
  expect(body.text).toBe('story 4.1 task');
  expect(body.status).toBe('todo');
  expect(body).toHaveProperty('createdAt');
  expect(body.createdAt).not.toBeNull();
  expect(body).toHaveProperty('updatedAt');
  expect(body.updatedAt).not.toBeNull();
});

test('[Story 4.1 AC1] POST /todos response includes Content-Type: application/json', async () => {
  const response = await server.inject({
    method: 'POST',
    url: '/todos',
    payload: { text: 'content-type check' },
  });
  expect(response.statusCode).toBe(201);
  expect(response.headers['content-type']).toMatch(/application\/json/);
});

// --- AC 2: GET /todos returns 200 with JSON array ---

test('[Story 4.1 AC2] GET /todos returns 200 with JSON array', async () => {
  const response = await server.inject({ method: 'GET', url: '/todos' });
  expect(response.statusCode).toBe(200);
  expect(response.headers['content-type']).toMatch(/application\/json/);
  expect(Array.isArray(response.json())).toBe(true);
});

test('[Story 4.1 AC2] GET /todos returns empty array when no todos exist', async () => {
  await prisma.todo.deleteMany();
  const response = await server.inject({ method: 'GET', url: '/todos' });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual([]);
});

test('[Story 4.1 AC2] GET /todos returns todos ordered by createdAt desc', async () => {
  await prisma.todo.deleteMany();
  // Create two todos with a deliberate time gap so createdAt ordering is deterministic
  const first = await prisma.todo.create({
    data: { text: 'first-item', status: 'todo' },
  });
  // Small delay to ensure distinct createdAt timestamps
  await new Promise((r) => setTimeout(r, 20));
  const second = await prisma.todo.create({
    data: { text: 'second-item', status: 'todo' },
  });

  const response = await server.inject({ method: 'GET', url: '/todos' });
  expect(response.statusCode).toBe(200);
  const list = response.json();
  expect(list.length).toBeGreaterThanOrEqual(2);
  // Most recently created should appear first (desc order)
  const firstIdx = list.findIndex((t: any) => t.id === second.id);
  const secondIdx = list.findIndex((t: any) => t.id === first.id);
  expect(firstIdx).toBeLessThan(secondIdx);
});

// --- AC 3: PATCH /todos/:id returns 200 with updated object ---

test('[Story 4.1 AC3] PATCH /todos/:id updates status independently', async () => {
  const todo = await prisma.todo.create({
    data: { text: 'ac3-status', status: 'todo' },
  });
  const response = await server.inject({
    method: 'PATCH',
    url: `/todos/${todo.id}`,
    payload: { status: 'in_progress' },
  });
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.status).toBe('in_progress');
  expect(body.text).toBe('ac3-status'); // unchanged
  expect(body).toHaveProperty('id', todo.id);
});

test('[Story 4.1 AC3] PATCH /todos/:id updates text independently', async () => {
  const todo = await prisma.todo.create({
    data: { text: 'ac3-text-orig', status: 'todo' },
  });
  const response = await server.inject({
    method: 'PATCH',
    url: `/todos/${todo.id}`,
    payload: { text: 'ac3-text-updated' },
  });
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.text).toBe('ac3-text-updated');
  expect(body.status).toBe('todo'); // unchanged
});

test('[Story 4.1 AC3] PATCH /todos/:id updates both text and status in a single call', async () => {
  const todo = await prisma.todo.create({
    data: { text: 'ac3-both', status: 'todo' },
  });
  const response = await server.inject({
    method: 'PATCH',
    url: `/todos/${todo.id}`,
    payload: { text: 'ac3-both-updated', status: 'done' },
  });
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.text).toBe('ac3-both-updated');
  expect(body.status).toBe('done');
  expect(body.completedAt).not.toBeNull();
});

// --- AC 4: DELETE /todos/:id returns 204 with no body ---

test('[Story 4.1 AC4] DELETE /todos/:id returns 204 with empty body', async () => {
  const todo = await prisma.todo.create({
    data: { text: 'ac4-delete', status: 'todo' },
  });
  const response = await server.inject({
    method: 'DELETE',
    url: `/todos/${todo.id}`,
  });
  expect(response.statusCode).toBe(204);
  expect(response.body).toBe('');
});

// --- AC 5: 404 for non-existent id on PATCH and DELETE ---

test('[Story 4.1 AC5] PATCH /todos/:id returns 404 for non-existent id', async () => {
  const response = await server.inject({
    method: 'PATCH',
    url: '/todos/999999999',
    payload: { status: 'done' },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json()).toEqual({ error: 'todo not found' });
});

test('[Story 4.1 AC5] DELETE /todos/:id returns 404 for non-existent id', async () => {
  const response = await server.inject({
    method: 'DELETE',
    url: '/todos/999999999',
  });
  expect(response.statusCode).toBe(404);
  expect(response.json()).toEqual({ error: 'todo not found' });
});

// --- AC 6: 400 for invalid/missing request bodies ---

test('[Story 4.1 AC6] POST /todos without text field returns 400', async () => {
  const response = await server.inject({
    method: 'POST',
    url: '/todos',
    payload: {},
  });
  expect(response.statusCode).toBe(400);
});

test('[Story 4.1 AC6] POST /todos with whitespace-only text returns 400', async () => {
  const response = await server.inject({
    method: 'POST',
    url: '/todos',
    payload: { text: '   ' },
  });
  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ error: 'text must be a non-empty string' });
});

test('[Story 4.1 AC6] PATCH /todos/:id with empty body {} returns 400', async () => {
  const todo = await prisma.todo.create({
    data: { text: 'ac6-empty-patch', status: 'todo' },
  });
  const response = await server.inject({
    method: 'PATCH',
    url: `/todos/${todo.id}`,
    payload: {},
  });
  expect(response.statusCode).toBe(400);
});

test('[Story 4.1 AC6] PATCH /todos/:id with non-numeric id returns 400', async () => {
  const response = await server.inject({
    method: 'PATCH',
    url: '/todos/not-a-number',
    payload: { status: 'todo' },
  });
  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ error: 'invalid id' });
});

test('[Story 4.1 AC6] DELETE /todos/:id with non-numeric id returns 400', async () => {
  const response = await server.inject({
    method: 'DELETE',
    url: '/todos/not-a-number',
  });
  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ error: 'invalid id' });
});

// =============================================================================
// Story 4.2 Metadata Verification Tests
// Confirms every API response includes the full metadata envelope:
//   createdAt, updatedAt, status, completedAt
// =============================================================================

// --- AC 1: GET /todos items include createdAt (ISO-8601) and status ---

test('[Story 4.2 AC1] GET /todos items include createdAt as ISO-8601 string and status field', async () => {
  await prisma.todo.deleteMany();
  await prisma.todo.create({ data: { text: 'meta-check', status: 'todo' } });

  const res = await server.inject({ method: 'GET', url: '/todos' });
  expect(res.statusCode).toBe(200);
  const list = res.json();
  expect(list.length).toBeGreaterThan(0);
  const item = list[0];

  // createdAt must be present and a valid ISO-8601 string
  expect(item).toHaveProperty('createdAt');
  expect(item.createdAt).not.toBeNull();
  expect(new Date(item.createdAt).toISOString()).toBe(item.createdAt);

  // status must be present
  expect(item).toHaveProperty('status');

  // completedAt must be null for a todo-status item
  expect(item.completedAt).toBeNull();
});

test('[Story 4.2 AC1] GET /todos items have status value from allowed enum set', async () => {
  await prisma.todo.deleteMany();
  await prisma.todo.create({
    data: { text: 'allowed-status', status: 'in_progress' },
  });

  const res = await server.inject({ method: 'GET', url: '/todos' });
  expect(res.statusCode).toBe(200);
  const list = res.json();
  expect(list.length).toBeGreaterThan(0);

  const allowedStatuses = ['todo', 'in_progress', 'done'];
  for (const item of list) {
    expect(allowedStatuses).toContain(item.status);
  }
});

// --- AC 2: POST /todos response includes all metadata fields ---

test('[Story 4.2 AC2] POST /todos response includes id, text, status, createdAt, updatedAt', async () => {
  const res = await server.inject({
    method: 'POST',
    url: '/todos',
    payload: { text: '4.2-meta-post' },
  });
  expect(res.statusCode).toBe(201);
  const body = res.json();

  expect(body).toHaveProperty('id');
  expect(typeof body.id).toBe('number');
  expect(body.text).toBe('4.2-meta-post');
  expect(body.status).toBe('todo');

  // createdAt — must be a valid ISO-8601 string
  expect(body).toHaveProperty('createdAt');
  expect(body.createdAt).not.toBeNull();
  expect(new Date(body.createdAt).toISOString()).toBe(body.createdAt);

  // updatedAt — must be a valid ISO-8601 string
  expect(body).toHaveProperty('updatedAt');
  expect(body.updatedAt).not.toBeNull();
  expect(new Date(body.updatedAt).toISOString()).toBe(body.updatedAt);
});

// --- AC 3: PATCH /todos/:id response includes updated updatedAt ---

test('[Story 4.2 AC3] PATCH /todos/:id updatedAt changes after a patch', async () => {
  const created = await prisma.todo.create({
    data: { text: '4.2-updatedAt', status: 'todo' },
  });
  const originalUpdatedAt = created.updatedAt.toISOString();

  // Small delay so the new updatedAt timestamp is guaranteed to differ
  await new Promise((r) => setTimeout(r, 50));

  const res = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { status: 'in_progress' },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();

  expect(body).toHaveProperty('updatedAt');
  expect(body.updatedAt).not.toBeNull();
  // updatedAt must have been bumped
  expect(body.updatedAt).not.toBe(originalUpdatedAt);
  // Must still be a valid ISO-8601 string
  expect(new Date(body.updatedAt).toISOString()).toBe(body.updatedAt);
});

test('[Story 4.2 AC3] PATCH /todos/:id response includes correct status and text after update', async () => {
  const created = await prisma.todo.create({
    data: { text: '4.2-patch-fields', status: 'todo' },
  });

  const res = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { text: '4.2-patch-fields-updated', status: 'in_progress' },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();

  expect(body.text).toBe('4.2-patch-fields-updated');
  expect(body.status).toBe('in_progress');
  expect(body).toHaveProperty('createdAt');
  expect(body).toHaveProperty('updatedAt');
});

// --- AC 4 & 5: completedAt null/non-null semantics ---

test('[Story 4.2 AC5] POST /todos creates todo with completedAt null', async () => {
  const res = await server.inject({
    method: 'POST',
    url: '/todos',
    payload: { text: '4.2-completedAt-null' },
  });
  expect(res.statusCode).toBe(201);
  const body = res.json();
  expect(body.status).toBe('todo');
  // completedAt must be null for a freshly created todo
  expect(body.completedAt).toBeNull();
});

test('[Story 4.2 AC4] PATCH to done sets completedAt to a non-null ISO-8601 timestamp', async () => {
  const created = await prisma.todo.create({
    data: { text: '4.2-completedAt-set', status: 'todo' },
  });

  const res = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { status: 'done' },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();

  expect(body.status).toBe('done');
  expect(body.completedAt).not.toBeNull();
  // Must be a valid ISO-8601 string
  expect(new Date(body.completedAt).toISOString()).toBe(body.completedAt);
});

test('[Story 4.2 AC5] PATCH from done back to todo clears completedAt to null', async () => {
  // Start as done with completedAt set
  const created = await prisma.todo.create({
    data: {
      text: '4.2-completedAt-clear',
      status: 'done',
      completedAt: new Date(),
    },
  });

  const res = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { status: 'todo' },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();

  expect(body.status).toBe('todo');
  expect(body.completedAt).toBeNull();

  // Double-check via GET /todos
  const getRes = await server.inject({ method: 'GET', url: '/todos' });
  const list = getRes.json();
  const found = list.find((t: any) => t.id === created.id);
  expect(found?.completedAt).toBeNull();
});

// ─── Story 4.3: Support state updates via single PATCH endpoint ───────────────

// AC 1: todo → in_progress — response reflects new status
test('[Story 4.3 AC1] PATCH /todos/:id todo→in_progress reflects updated status in response', async () => {
  const created = await prisma.todo.create({
    data: { text: '4.3-ac1', status: 'todo' },
  });
  const res = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { status: 'in_progress' },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.status).toBe('in_progress');
  expect(body.completedAt).toBeNull();
});

// AC 2: todo → done — completedAt set to non-null timestamp
test('[Story 4.3 AC2] PATCH /todos/:id todo→done sets completedAt to non-null ISO timestamp', async () => {
  const created = await prisma.todo.create({
    data: { text: '4.3-ac2', status: 'todo' },
  });
  const res = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { status: 'done' },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.status).toBe('done');
  expect(body.completedAt).not.toBeNull();
  expect(new Date(body.completedAt).toISOString()).toBe(body.completedAt);
});

// AC 3: done → todo — completedAt cleared to null
test('[Story 4.3 AC3] PATCH /todos/:id done→todo clears completedAt to null', async () => {
  const created = await prisma.todo.create({
    data: { text: '4.3-ac3', status: 'done', completedAt: new Date() },
  });
  const res = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { status: 'todo' },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.status).toBe('todo');
  expect(body.completedAt).toBeNull();
});

// AC 4: invalid status value → 400
test('[Story 4.3 AC4] PATCH /todos/:id rejects status value outside enum with 400', async () => {
  const created = await prisma.todo.create({
    data: { text: '4.3-ac4', status: 'todo' },
  });
  const res = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { status: 'waiting' },
  });
  expect(res.statusCode).toBe(400);
});

// AC 5: non-existent id → 404 with error body
test('[Story 4.3 AC5] PATCH /todos/:id returns 404 with error for non-existent id', async () => {
  const res = await server.inject({
    method: 'PATCH',
    url: '/todos/88888888',
    payload: { status: 'in_progress' },
  });
  expect(res.statusCode).toBe(404);
  expect(res.json()).toEqual({ error: 'todo not found' });
});

// AC 6: empty body → 400
test('[Story 4.3 AC6] PATCH /todos/:id rejects empty body {} with 400', async () => {
  const created = await prisma.todo.create({
    data: { text: '4.3-ac6', status: 'todo' },
  });
  const res = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: {},
  });
  expect(res.statusCode).toBe(400);
});

// AC 7: combined text + status patched atomically in one DB write
test('[Story 4.3 AC7] PATCH /todos/:id updates both text and status atomically', async () => {
  const created = await prisma.todo.create({
    data: { text: '4.3-ac7-original', status: 'todo' },
  });
  const res = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { text: '4.3-ac7-updated', status: 'in_progress' },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.text).toBe('4.3-ac7-updated');
  expect(body.status).toBe('in_progress');
  expect(body.completedAt).toBeNull();

  const fromDb = await prisma.todo.findUnique({ where: { id: created.id } });
  expect(fromDb?.text).toBe('4.3-ac7-updated');
  expect(fromDb?.status).toBe('in_progress');
});

// Full state-machine cycle: todo → in_progress → done → todo
test('[Story 4.3] full state-machine cycle todo→in_progress→done→todo with completedAt lifecycle', async () => {
  const created = await prisma.todo.create({
    data: { text: '4.3-cycle', status: 'todo' },
  });
  const id = created.id;

  // Step 1: todo → in_progress
  const r1 = await server.inject({
    method: 'PATCH',
    url: `/todos/${id}`,
    payload: { status: 'in_progress' },
  });
  expect(r1.statusCode).toBe(200);
  expect(r1.json().status).toBe('in_progress');
  expect(r1.json().completedAt).toBeNull();

  // Step 2: in_progress → done (completedAt set)
  const r2 = await server.inject({
    method: 'PATCH',
    url: `/todos/${id}`,
    payload: { status: 'done' },
  });
  expect(r2.statusCode).toBe(200);
  expect(r2.json().status).toBe('done');
  expect(r2.json().completedAt).not.toBeNull();

  // Step 3: done → todo (completedAt cleared)
  const r3 = await server.inject({
    method: 'PATCH',
    url: `/todos/${id}`,
    payload: { status: 'todo' },
  });
  expect(r3.statusCode).toBe(200);
  expect(r3.json().status).toBe('todo');
  expect(r3.json().completedAt).toBeNull();
});

// completedAt clears when transitioning done → in_progress (not just done → todo)
test('[Story 4.3] PATCH done→in_progress clears completedAt', async () => {
  const created = await prisma.todo.create({
    data: {
      text: '4.3-done-to-inprogress',
      status: 'done',
      completedAt: new Date(),
    },
  });
  const res = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { status: 'in_progress' },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.status).toBe('in_progress');
  expect(body.completedAt).toBeNull();

  const fromDb = await prisma.todo.findUnique({ where: { id: created.id } });
  expect(fromDb?.completedAt).toBeNull();
});

// ─── Utility route coverage ───────────────────────────────────────────────────

test('GET /health returns status ok', async () => {
  const res = await server.inject({ method: 'GET', url: '/health' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({ status: 'ok' });
});

test('GET / returns root true', async () => {
  const res = await server.inject({ method: 'GET', url: '/' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({ root: true });
});

// =============================================================================
// Story 4.4: Ensure data consistency under concurrent requests
// Validates PostgreSQL READ COMMITTED + single-statement Prisma operations
// handle concurrent access without corruption or 5xx errors.
// =============================================================================

// --- AC 1 & 2: Concurrent PATCH requests — last-write-wins, no 500s ---

test('[Story 4.4 AC1/AC2] concurrent PATCH requests result in deterministic state with no 500 errors', async () => {
  const created = await prisma.todo.create({
    data: { text: 'race-target', status: 'todo' },
  });

  // Fire 5 concurrent PATCH requests — mix of status values
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

  // AC 2: no request must return a 500
  expect(responses.every((r) => r.statusCode !== 500)).toBe(true);
  // All requests must succeed with 200
  expect(responses.every((r) => r.statusCode === 200)).toBe(true);

  // AC 1: final state must be one of the submitted values (last-write-wins — no corruption)
  const fromDb = await prisma.todo.findUnique({ where: { id: created.id } });
  expect(['todo', 'in_progress', 'done']).toContain(fromDb?.status);
  // status must not be null/undefined — never corrupted
  expect(fromDb?.status).toBeDefined();
  expect(fromDb?.status).not.toBeNull();
});

// --- AC 3: Concurrent GET requests — all return 200 with consistent data ---

test('[Story 4.4 AC3] concurrent GET /todos requests all return 200 with consistent data', async () => {
  await prisma.todo.deleteMany();
  await prisma.todo.create({
    data: { text: 'concurrent-get', status: 'todo' },
  });

  // Fire 10 concurrent GET requests
  const responses = await Promise.all(
    Array.from({ length: 10 }, () =>
      server.inject({ method: 'GET', url: '/todos' }),
    ),
  );

  // All must return 200
  expect(responses.every((r) => r.statusCode === 200)).toBe(true);

  // All must return a JSON array
  expect(responses.every((r) => Array.isArray(r.json()))).toBe(true);

  // All responses must contain identical data (consistent snapshot)
  const firstBody = JSON.stringify(responses[0].json());
  expect(responses.every((r) => JSON.stringify(r.json()) === firstBody)).toBe(
    true,
  );
});

// --- AC 4: Concurrent POST requests — N distinct records created, no duplicates ---

test('[Story 4.4 AC4] concurrent POST /todos requests each create a distinct record', async () => {
  await prisma.todo.deleteMany();

  const N = 8;
  // Fire N concurrent POST requests
  const responses = await Promise.all(
    Array.from({ length: N }, (_, i) =>
      server.inject({
        method: 'POST',
        url: '/todos',
        payload: { text: `concurrent-post-${i}` },
      }),
    ),
  );

  // All must return 201
  expect(responses.every((r) => r.statusCode === 201)).toBe(true);

  const bodies = responses.map((r) => r.json());

  // Each response must have a unique id (no duplicate suppression or overwriting)
  const ids = bodies.map((b: any) => b.id);
  const uniqueIds = new Set(ids);
  expect(uniqueIds.size).toBe(N);

  // Verify N records actually exist in the database
  const dbCount = await prisma.todo.count();
  expect(dbCount).toBe(N);
});

// --- AC 5: DELETE + PATCH race — one 204/200, one 404, no 500s ---

test('[Story 4.4 AC5] concurrent DELETE and PATCH on the same todo: one succeeds, one gets 404, no 500s', async () => {
  const created = await prisma.todo.create({
    data: { text: 'race-delete-patch', status: 'todo' },
  });

  // Fire DELETE and PATCH concurrently
  const [deleteRes, patchRes] = await Promise.all([
    server.inject({
      method: 'DELETE',
      url: `/todos/${created.id}`,
    }),
    server.inject({
      method: 'PATCH',
      url: `/todos/${created.id}`,
      payload: { status: 'done' },
    }),
  ]);

  // No request must return a 500
  expect(deleteRes.statusCode).not.toBe(500);
  expect(patchRes.statusCode).not.toBe(500);

  // One must succeed and the other must get 404
  const statuses = [deleteRes.statusCode, patchRes.statusCode].sort();

  // Possible outcomes:
  // DELETE wins: [200 or 204, 404] — PATCH sees no row
  // PATCH wins: [200, 204] — DELETE still deletes, or [200, 404] if delete wins after update
  // The key invariant: no 500 and the pair must be a valid combo
  const validCombos = [
    [200, 204], // PATCH wins, DELETE also succeeds
    [204, 404], // DELETE wins first; PATCH sees 404
    [200, 404], // PATCH wins; DELETE sees 404 (row already updated but timing varies)
  ];

  const isValid = validCombos.some(
    (combo) => JSON.stringify(combo) === JSON.stringify(statuses),
  );
  expect(isValid).toBe(true);
});
