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
      let { text } = request.body as { text: string };
      if (!fastify.prisma) {
        // return an explicit reply rather than throwing after setting code
        return reply.code(500).send({ error: 'database not initialized' });
      }
      text = text.trim();
      if (!text) {
        return reply
          .code(400)
          .send({ error: 'text must be a non-empty string' });
      }
      const todo = await fastify.prisma.todo.create({
        data: { text, status: 'todo' },
      });
      reply.code(201).send(todo);
    },
  );

  fastify.get('/todos', async (request, reply) => {
    if (!fastify.prisma) {
      // mirror POST handler behaviour for consistent error payload
      return reply.code(500).send({ error: 'database not initialized' });
    }
    const list = await fastify.prisma.todo.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return list;
  });

  // PATCH status update
  fastify.patch(
    '/todos/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'number' } },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['todo', 'in-progress', 'done'],
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!fastify.prisma) {
        return reply.code(500).send({ error: 'database not initialized' });
      }
      const {
        params: { id },
        body: { status },
      } = request as any;
      fastify.log.info(`PATCH /todos/${id} status=${status}`);
      try {
        const todo = await fastify.prisma.todo.update({
          where: { id },
          data: { status },
        });
        return todo;
      } catch (err: any) {
        fastify.log.error('patch error', err);
        if (err.code === 'P2025') {
          // record not found
          return reply.code(404).send({ error: 'todo not found' });
        }
        throw err;
      }
    },
  );
};

export default todos;
