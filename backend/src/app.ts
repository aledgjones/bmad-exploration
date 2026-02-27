import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload';
import { FastifyPluginAsync, FastifyServerOptions } from 'fastify';

export interface AppOptions
  extends FastifyServerOptions, Partial<AutoloadPluginOptions> {}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {};

const __dirname = dirname(fileURLToPath(import.meta.url));

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts,
): Promise<void> => {
  // Place here your custom code!

  // log port so environment variable is referenced and helps debugging
  fastify.addHook('onReady', async () => {
    const port = process.env.PORT || '3000';
    fastify.log.info(`using PORT=${port}`);
  });

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts,
  });

  // This loads all plugins defined in routes
  // define your routes in one of these
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: opts,
  });
};

// helper to expose resolved port for testing/clarity
export function getPort(): number {
  return Number(process.env.PORT) || 3000;
}

export default app;
export { app, options };
