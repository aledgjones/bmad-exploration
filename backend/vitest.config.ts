import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // limit to backend/test directory to avoid double-running compiled files
    include: ['test/**/*.ts'],
    exclude: ['test/compose-helper.ts'],
  },
});
