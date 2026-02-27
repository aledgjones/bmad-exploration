import { test, expect } from 'vitest';
import Fastify from 'fastify';
import { app, options } from '../src/app.js';
import { PrismaClient } from '@prisma/client';

// smoke test: app starts and Prisma connects

test('backend server can start and stop', async () => {
  const server = Fastify();
  await server.register(app, options);
  // simply ensure initialization completes without throwing
  await server.ready();
  await server.close();
});

test('prisma client can connect', async () => {
  process.env.DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5432/postgres';
  const prisma = new PrismaClient();
  await prisma.$connect();
  const result = await prisma.todo.findMany();
  expect(result).toBeInstanceOf(Array);
  await prisma.$disconnect();
});

// verify getPort helper reads environment variable
import { getPort } from '../src/app.js';

test('getPort returns env PORT or default', () => {
  delete process.env.PORT;
  expect(getPort()).toBe(3000);
  process.env.PORT = '4567';
  expect(getPort()).toBe(4567);
});
