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
