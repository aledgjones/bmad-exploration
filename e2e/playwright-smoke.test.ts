import { test, expect, beforeAll, afterAll } from 'vitest';
import { chromium } from '@playwright/test';
import { startCompose } from './compose-helper.js';

// simple smoke test that spins up the compose stack programmatically via a
// shared helper. the npm script `test:e2e` still exists but is no longer
// required for local runs.

let composeEnv: any;

beforeAll(async () => {
  composeEnv = await startCompose();
}, 120_000);

afterAll(async () => {
  if (composeEnv) {
    await composeEnv.down();
  }
}, 120_000);

test('frontend homepage reachable through compose stack', async () => {
  const port = process.env.FRONTEND_PORT || '3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}`);
  // basic assertion: page has some content
  const text = await page.textContent('body');
  expect(text).toBeTruthy();
  await browser.close();
});
