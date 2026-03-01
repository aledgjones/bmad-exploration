import { test, expect, beforeAll, afterAll } from 'vitest';
import { chromium } from '@playwright/test';
import { startCompose } from './compose-helper.js';

// simple smoke test that spins up the compose stack programmatically via a
// shared helper. the npm script `test:e2e` still exists but is no longer
// required for local runs.

let composeEnv: any | null = null;

beforeAll(async () => {
  composeEnv = await startCompose();
}, 120_000);

afterAll(async () => {
  if (composeEnv) {
    await composeEnv.down();
  }
}, 120_000);

test('frontend homepage reachable through compose stack', async () => {
  expect(composeEnv).not.toBeNull();
  const port = process.env.FRONTEND_PORT || '3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}`);
  // basic assertion: page has some content
  const text = await page.textContent('body');
  expect(text).toBeTruthy();
  await browser.close();
});

// exercise the new-todo flow end-to-end
test('user can create a todo via UI', async () => {
  // increased timeout due to compose startup

  expect(composeEnv).not.toBeNull();
  const port = process.env.FRONTEND_PORT || '3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}`);
  // intercept network to verify POST actually happened
  let postCount = 0;
  await page.route('**/todos', (route, request) => {
    if (request.method() === 'POST') postCount++;
    route.continue();
  });

  // fill form and submit
  await page.fill('input[placeholder="New todo"]', 'walk the dog');
  await page.click('button:has-text("Add")');
  // wait for the new item to appear
  await page.waitForSelector('text=walk the dog');
  // ensure we saw one POST
  expect(postCount).toBe(1);
  // ensure it's inside a card element by checking card class
  const cardExists = await page.$('div.bg-card:has-text("walk the dog")');
  expect(cardExists).not.toBeNull();
  const bodyText = await page.textContent('body');
  expect(bodyText).toContain('walk the dog');
  await browser.close();
}, 30000);

// new test: verify todos persist on reload
test('todos persist after page refresh', async () => {
  expect(composeEnv).not.toBeNull();
  const port = process.env.FRONTEND_PORT || '3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}`);
  // create an item
  await page.fill('input[placeholder="New todo"]', 'persist item');
  await page.click('button:has-text("Add")');
  await page.waitForSelector('text=persist item');
  // reload and confirm
  await page.reload();
  await page.waitForSelector('text=persist item');
  await browser.close();
});

// test status-change flow with persistence

test('user can change status and it persists', async () => {
  expect(composeEnv).not.toBeNull();
  const port = process.env.FRONTEND_PORT || '3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (msg) => {
    console.log('PAGE LOG>', msg.text());
  });
  let patchCount = 0;
  // log PATCH response details to help debug persistence
  page.on('response', async (res) => {
    if (res.url().includes('/todos')) {
      console.log(
        'todos response',
        res.request().method(),
        res.status(),
        res.url(),
      );
    }
    if (res.request().method() === 'PATCH' && res.url().includes('/todos/')) {
      patchCount++;
      try {
        const txt = await res.text();
        console.log('PATCH body', txt);
      } catch {}
    }
  });
  await page.goto(`http://localhost:${port}`);
  // create a fresh todo
  await page.fill('input[placeholder="New todo"]', 'status item');
  await page.click('button:has-text("Add")');
  await page.waitForSelector('text=status item');

  // previously intercepted PATCH calls, but this hook caused errors and
  // prevented requests from reaching the backend.  We'll rely on the response
  // listener above instead and omit manual interception.
  // patchCount is tracked via the response listener defined earlier

  // locate the card we just added so we operate on the correct row
  const myCard = await page.waitForSelector(
    'div.bg-card:has-text("status item")',
  );
  const getSelect = async () => {
    const sel = await myCard.$('select[aria-label="Change todo status"]');
    if (!sel) throw new Error('status dropdown not found');
    return sel;
  };

  // change to in-progress and then done via the select within the card
  let statusSelect = await getSelect();
  await statusSelect.selectOption('in-progress');
  // element may detach when the item re-renders, so select via DOM query each time
  await page.selectOption(
    'div.bg-card:has-text("status item") select[aria-label="Change todo status"]',
    'done',
  );

  // after done, card should eventually have line-through style locally
  await page.waitForSelector(
    '[class*=\"line-through\"]:has-text("status item")',
  );
  const doneCard = await page.$(
    '[class*=\"line-through\"]:has-text("status item")',
  );
  expect(doneCard).not.toBeNull();

  // refresh and confirm still done
  await page.reload();
  await page.waitForSelector('text=status item');
  await page.waitForSelector(
    '[class*=\"line-through\"]:has-text("status item")',
  );

  await browser.close();
}, 60000);
