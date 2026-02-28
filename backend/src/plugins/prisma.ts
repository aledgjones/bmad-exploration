import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

/**
 * Attach a singleton PrismaClient to the Fastify instance and manage lifecycle.
 * If DATABASE_URL is not set we decorate with null so server can start in smoke
 * tests without needing a DB connection.
 */
export default fp(async (fastify) => {
  if (process.env.DATABASE_URL) {
    const prisma = new PrismaClient();
    await prisma.$connect();

    fastify.decorate('prisma', prisma);

    fastify.addHook('onClose', async () => {
      await prisma.$disconnect();
    });
  } else {
    fastify.decorate('prisma', null);
  }
});

// augment fastify types so TypeScript knows about our decoration
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient | null;
  }
}
