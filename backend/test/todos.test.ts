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
