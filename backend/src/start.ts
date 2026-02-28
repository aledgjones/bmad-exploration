/* istanbul ignore file */
import Fastify from 'fastify';
import app, { options, getPort } from './app.js';

async function run() {
  const server = Fastify(options);
  // register the autoloaded app plugin
  await server.register(app);

  // run pending migrations before accepting traffic
  if (process.env.DATABASE_URL) {
    try {
      // use spawnSync to ensure CLI output is visible
      const { spawnSync } = await import('node:child_process');
      server.log.info('running prisma migrate deploy');
      const res = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
        stdio: 'inherit',
        env: process.env,
      });
      if (res.status !== 0) {
        throw new Error('prisma migrate deploy failed');
      }
    } catch (e) {
      server.log.error('migration step failed: ' + String(e));
    }
  }

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
