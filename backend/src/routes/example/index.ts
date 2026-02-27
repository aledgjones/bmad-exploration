import type { FastifyPluginAsync } from 'fastify'

const example: FastifyPluginAsync = async (fastifyInstance, opts): Promise<void> => {
  fastifyInstance.get('/', async function (request, reply) {
    return 'this is an example'
  })
}

export default example
