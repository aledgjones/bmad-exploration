import Fastify from 'fastify';
import app, { options, getPort } from './app.js';

async function run() {
  const server = Fastify(options);
  // register the autoloaded app plugin
  await server.register(app);

  const port = getPort();
  server.log.info(`listening on port ${port}`);
  await server.listen({ port, host: '0.0.0.0' });
}

// export for testing purposes
export { run };

// run when executed directly (node or ts-node)
if (import.meta.main) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
