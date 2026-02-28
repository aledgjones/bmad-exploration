import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    include: ['**/*.{test,spec}.{js,ts,tsx}'],
    // coverage configuration added by story 1.6
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      reportsDirectory: 'coverage',
      include: ['app/**/*.{ts,tsx,js}'],
      exclude: ['node_modules/', 'dist/'],
    },
  },
});
