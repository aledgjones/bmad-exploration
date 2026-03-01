/// <reference lib="dom" />
import { test, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { app, options } from '../src/app.js';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer } from 'testcontainers';

let prisma: PrismaClient;
let container: any;

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
});

afterAll(async () => {
  if (prisma) await prisma.$disconnect();
  if (container) await container.stop();
});

test('POST /todos creates a todo with default status', async () => {
  const server = Fastify();
  await server.register(app, options);
  await server.ready();

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
  const server = Fastify();
  await server.register(app, options);
  await server.ready();

  const response = await server.inject({
    method: 'POST',
    url: '/todos',
    payload: { text: '   ' },
  });

  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ error: 'text must be a non-empty string' });
});

test('GET /todos returns empty list when there are no todos', async () => {
  const server = Fastify();
  await server.register(app, options);
  await server.ready();

  // ensure database is clean in case prior tests left data
  await prisma.todo.deleteMany();

  const response = await server.inject({ method: 'GET', url: '/todos' });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual([]);
});

test('GET /todos returns list including created tasks', async () => {
  const server = Fastify();
  await server.register(app, options);
  await server.ready();

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

  await server.close();
});

test('example route responds correctly', async () => {
  const server = Fastify();
  const exampleRoute = (await import('../src/routes/example/index')).default;
  await server.register(exampleRoute as any, { prefix: '/example' });
  await server.ready();

  const res = await server.inject({ method: 'GET', url: '/example' });
  expect(res.statusCode).toBe(200);
  expect(res.body).toBe('this is an example');

  await server.close();
});

// --- new status-change tests ---

test('PATCH /todos/:id updates status when valid', async () => {
  const server = Fastify();
  await server.register(app, options);
  await server.ready();

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

  await server.close();
});

test('PATCH /todos/:id rejects invalid status', async () => {
  const server = Fastify();
  await server.register(app, options);
  await server.ready();

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

  await server.close();
});

test('PATCH /todos/:id returns 404 for missing item', async () => {
  const server = Fastify();
  await server.register(app, options);
  await server.ready();

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

  await server.close();
});

// new test: completion timestamp is recorded when marking done

test('PATCH /todos/:id sets completedAt when status done', async () => {
  const server = Fastify();
  await server.register(app, options);
  await server.ready();

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

  await server.close();
});

// new test: completedAt cleared when status moves away from done

test('PATCH /todos/:id clears completedAt when status returns from done', async () => {
  const server = Fastify();
  await server.register(app, options);
  await server.ready();

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

  await server.close();
});

// new test to exercise invalid id parsing

test('PATCH /todos/:id rejects non-numeric id', async () => {
  const server = Fastify();
  await server.register(app, options);
  await server.ready();

  const response = await server.inject({
    method: 'PATCH',
    url: '/todos/not-a-number',
    payload: { status: 'todo' },
  });
  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ error: 'invalid id' });

  await server.close();
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
});
