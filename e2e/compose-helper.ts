import path from 'node:path';
import { DockerComposeEnvironment, Wait } from 'testcontainers';

/**
 * Starts the docker-compose stack located at the repo root.
 * Returns the started environment which must be shut down via `.down()`.
 */
export async function startCompose() {
  const composeFilePath = path.resolve(__dirname, '..');
  const env = await new DockerComposeEnvironment(
    composeFilePath,
    'docker-compose.yml',
  )
    // propagate overrideable ports and credentials through environment map
    .withEnvironment({
      BACKEND_PORT: process.env.BACKEND_PORT || '4000',
      FRONTEND_PORT: process.env.FRONTEND_PORT || '3000',
      POSTGRES_HOST_PORT: process.env.POSTGRES_HOST_PORT || '5432',
      POSTGRES_USER: process.env.POSTGRES_USER || 'postgres',
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || 'postgres',
      POSTGRES_DB: process.env.POSTGRES_DB || 'postgres',
    })
    .withWaitStrategy('postgres-1', Wait.forHealthCheck())
    .withWaitStrategy('backend-1', Wait.forHealthCheck())
    .withWaitStrategy('frontend-1', Wait.forHealthCheck())
    .withBuild()
    .up(['postgres', 'backend', 'frontend']);

  return env;
}
