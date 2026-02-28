import type { FastifyPluginAsync } from 'fastify';

const todos: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post(
    '/todos',
    {
      schema: {
        body: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { text } = request.body as { text: string };
      if (!fastify.prisma) {
        reply.code(500);
        throw new Error('database not initialized');
      }
      const todo = await fastify.prisma.todo.create({ data: { text } });
      reply.code(201).send(todo);
    },
  );

  fastify.get('/todos', async (request, reply) => {
    if (!fastify.prisma) {
      reply.code(500);
      throw new Error('database not initialized');
    }
    const list = await fastify.prisma.todo.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return list;
  });
};

export default todos;
