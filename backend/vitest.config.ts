import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    // limit to backend/test directory to avoid double-running compiled files
    include: ['test/**/*.ts'],
    exclude: ['test/compose-helper.ts'],
  },
});
