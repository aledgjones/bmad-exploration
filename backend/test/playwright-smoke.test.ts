import { test, expect } from 'vitest';
import { chromium } from '@playwright/test';
import { startCompose } from './compose-helper.js';

// sample smoke test demonstrating integration via Testcontainers and Playwright

// This test is a proof‑of‑concept; building the full compose stack via
// Testcontainers can be slow and has dependencies on a working Docker
// environment. Future story 1.5 will stabilize the e2e pipeline. For now we
// skip the execution to keep the normal test suite fast.
test.skip('frontend homepage reachable through compose stack', async () => {
  const compose = await startCompose();
  try {
    const port = process.env.FRONTEND_PORT || '3000';
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}`);
    // basic assertion: page has some content
    const text = await page.textContent('body');
    expect(text).toBeTruthy();
    await browser.close();
  } finally {
    await compose.down();
  }
});
