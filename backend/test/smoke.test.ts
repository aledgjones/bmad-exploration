/// <reference lib="dom" />
import { test, expect } from 'vitest';
import Fastify from 'fastify';
import { app, options } from '../src/app.js';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer } from 'testcontainers';

// smoke test: app starts and Prisma connects

test('backend server can start and stop', async () => {
  const server = Fastify();
  await server.register(app, options);
  // simply ensure initialization completes without throwing
  await server.ready();
  await server.close();
});

test('prisma client can connect', async () => {
  // launch a real postgres container for the duration of this test
  const container = await new PostgreSqlContainer('postgres:15')
    .withDatabase('postgres')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();

  process.env.DATABASE_URL = container.getConnectionUri();
  const prisma = new PrismaClient();
  await prisma.$connect();
  // just verify that connection can be established; schema may be empty in a
  // fresh container
  await prisma.$disconnect();

  await container.stop();
});

// verify getPort helper reads environment variable
import { getPort } from '../src/app.js';

test('getPort returns env PORT or default', () => {
  delete process.env.PORT;
  expect(getPort()).toBe(4000);
  process.env.PORT = '4567';
  expect(getPort()).toBe(4567);
});
