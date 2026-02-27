import type { FastifyPluginAsync } from 'fastify';

const root: FastifyPluginAsync = async (
  fastifyInstance,
  opts,
): Promise<void> => {
  fastifyInstance.get('/', async function (request, reply) {
    return { root: true };
  });
};

export default root;
