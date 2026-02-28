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
  // apply migrations so table exists
  await new Promise<void>((resolve, reject) => {
    const { spawn } = require('child_process');
    const cmd = spawn('npx', ['prisma', 'migrate', 'deploy'], {
      env: process.env,
    });
    cmd.on('exit', (code: number) => {
      if (code === 0) resolve();
      else reject(new Error('migration failed'));
    });
  });
});

afterAll(async () => {
  if (prisma) await prisma.$disconnect();
  if (container) await container.stop();
});

test('POST /todos creates a todo', async () => {
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
  await prisma.todo.create({ data: { text: 'another' } });
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
  const created = await prisma.todo.create({ data: { text: 'foo' } });

  const response = await server.inject({
    method: 'PATCH',
    url: `/todos/${created.id}`,
    payload: { status: 'in-progress' },
  });

  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body).toHaveProperty('id', created.id);
  expect(body.status).toBe('in-progress');

  // verify database persisted
  const fromDb = await prisma.todo.findUnique({ where: { id: created.id } });
  expect(fromDb?.status).toBe('in-progress');

  await server.close();
});

test('PATCH /todos/:id rejects invalid status', async () => {
  const server = Fastify();
  await server.register(app, options);
  await server.ready();

  const created = await prisma.todo.create({ data: { text: 'bar' } });

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
  expect(response.statusCode).toBe(404);
  expect(response.json()).toEqual({ error: 'todo not found' });

  await server.close();
});
