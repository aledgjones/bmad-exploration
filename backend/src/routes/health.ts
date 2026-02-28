import type { FastifyPluginAsync } from 'fastify';

const health: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    // simple status object; more details (db, etc.) could be added later
    return { status: 'ok' };
  });
};

export default health;
