import { defineConfig } from '@playwright/test';

// Playwright configuration for the monorepo e2e suite.  Tests are placed
// under backend/test for now (the smoke test and future additions).  The
// baseURL is pointed at the compose stack's frontend port so tests can use
// relative URLs.

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${process.env.FRONTEND_PORT || 3000}`,
    headless: true,
  },
});
