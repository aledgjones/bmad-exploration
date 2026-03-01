/// <reference lib="dom" />
import { test, expect, beforeAll } from 'vitest';
import Fastify from 'fastify';
import { app, options } from '../src/app.js';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer } from 'testcontainers';
import net from 'net';

let dbAvailable = false;

beforeAll(async () => {
  if (process.env.DATABASE_URL) {
    const m = process.env.DATABASE_URL.match(/@([^:]+):(\d+)/);
    if (m) {
      const host = m[1];
      const port = parseInt(m[2], 10);
      dbAvailable = await new Promise<boolean>((resolve) => {
        const sock = new net.Socket();
        sock.setTimeout(500);
        sock.on('connect', () => {
          sock.destroy();
          resolve(true);
        });
        sock.on('error', () => resolve(false));
        sock.on('timeout', () => {
          sock.destroy();
          resolve(false);
        });
        sock.connect(port, host);
      });
    }
  }
});

// smoke test: app starts and Prisma connects

test('backend server can start and stop', { skip: !dbAvailable }, async () => {
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
