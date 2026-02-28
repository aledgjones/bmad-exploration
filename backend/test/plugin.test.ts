import { test, expect, vi } from 'vitest';
import Fastify from 'fastify';

// make a fake PrismaClient to avoid needing a real database when DATABASE_URL is set
vi.mock('@prisma/client', () => {
  return {
    PrismaClient: class {
      async $connect() {}
      async $disconnect() {}
    },
  };
});

import prismaPlugin from '../src/plugins/prisma';

test('prisma plugin decorates null when DATABASE_URL unset', async () => {
  delete process.env.DATABASE_URL;
  const server = Fastify();
  await server.register(prismaPlugin);
  await server.ready();
  // @ts-ignore
  expect(server.prisma).toBeNull();
});

test('prisma plugin attaches client when DATABASE_URL set', async () => {
  process.env.DATABASE_URL = 'postgres://user:pass@localhost/db';
  const server = Fastify();
  await server.register(prismaPlugin);
  await server.ready();
  // @ts-ignore
  expect(server.prisma).not.toBeNull();
  // cleanup
  await server.close();
  delete process.env.DATABASE_URL;
});
