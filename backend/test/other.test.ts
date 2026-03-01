/// <reference lib="dom" />
import { test, expect, beforeAll } from 'vitest';
import Fastify from 'fastify';
import { app, options } from '../src/app.js';
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

// simple route coverage
// these endpoints require DB because plugin tries to connect; skip if unavailable
test('GET / returns root true', { skip: !dbAvailable }, async () => {
  const server = Fastify();
  await server.register(app, options);
  await server.ready();

  const res = await server.inject({ method: 'GET', url: '/' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({ root: true });
});

test('GET /health returns status ok', { skip: !dbAvailable }, async () => {
  const server = Fastify();
  await server.register(app, options);
  await server.ready();

  const res = await server.inject({ method: 'GET', url: '/health' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({ status: 'ok' });
});

// plugin branch coverage
test('prisma plugin decorates prisma null when DATABASE_URL missing', async () => {
  // explicitly clear or falsify the env var so plugin logic skips connection
  delete process.env.DATABASE_URL;
  process.env.DATABASE_URL = '';

  const fastify = Fastify();
  const plugin = await import('../src/plugins/prisma.js').then(
    (m) => m.default,
  );
  await fastify.register(plugin);
  await fastify.ready();
  expect(fastify.prisma).toBeNull();
});
