/// <reference lib="dom" />
import { test, expect } from 'vitest';
import Fastify from 'fastify';
import { app, options } from '../src/app.js';

// simple route coverage
test('GET / returns root true', async () => {
  const server = Fastify();
  await server.register(app, options);
  await server.ready();

  const res = await server.inject({ method: 'GET', url: '/' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({ root: true });
});

test('GET /health returns status ok', async () => {
  const server = Fastify();
  await server.register(app, options);
  await server.ready();

  const res = await server.inject({ method: 'GET', url: '/health' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({ status: 'ok' });
});

// plugin branch coverage
test('prisma plugin decorates prisma null when DATABASE_URL missing', async () => {
  delete process.env.DATABASE_URL;
  const fastify = Fastify();
  const plugin = await import('../src/plugins/prisma.js').then(
    (m) => m.default,
  );
  await fastify.register(plugin);
  await fastify.ready();
  expect(fastify.prisma).toBeNull();
});
