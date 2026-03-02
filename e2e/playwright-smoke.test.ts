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
  await page.goto(`http://localhost:${port}`);
  // create a fresh todo
  await page.fill('input[placeholder="New todo"]', 'status item');
  await page.click('button:has-text("Add")');
  await page.waitForSelector('text=status item');

  // locate the card we just added so we operate on the correct row
  const myCard = await page.waitForSelector(
    'div.bg-card:has-text("status item")',
  );
  const getSelect = async () => {
    const sel = await myCard.$('select[aria-label="Change todo status"]');
    if (!sel) throw new Error('status dropdown not found');
    return sel;
  };

  // change to in_progress and then done via the select within the card
  let statusSelect = await getSelect();
  await statusSelect.selectOption('in_progress');
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
  // now change back to todo and ensure completed styling removed and persists
  await page.selectOption(
    'div.bg-card:has-text("status item") select[aria-label="Change todo status"]',
    'todo',
  );
  // wait for line-through to disappear (optimistic update)
  await page.waitForFunction(() => {
    const span = document.querySelector('div.bg-card span');
    return span && !span.className.includes('line-through');
  });
  // verify select value is now 'todo'
  const selVal = await page.$eval(
    'div.bg-card:has-text("status item") select[aria-label="Change todo status"]',
    (el) => (el as HTMLSelectElement).value,
  );
  expect(selVal).toBe('todo');
  // not line-through anymore
  const doneCheck = await page.$(
    '[class*="line-through"]:has-text("status item")',
  );
  expect(doneCheck).toBeNull();

  // reload and verify still not done
  await page.reload();
  await page.waitForSelector('text=status item');
  const selValAfterReload = await page.$eval(
    'div.bg-card:has-text("status item") select[aria-label="Change todo status"]',
    (el) => (el as HTMLSelectElement).value,
  );
  expect(selValAfterReload).toBe('todo');
  await browser.close();
}, 60000);

// --- DELETE flow tests ---

test('user can delete a todo and it stays deleted after reload', async () => {
  expect(composeEnv).not.toBeNull();
  const port = process.env.FRONTEND_PORT || '3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}`);

  // create a todo to delete
  await page.fill('input[placeholder="New todo"]', 'delete me');
  await page.click('button:has-text("Add")');
  await page.waitForSelector('text=delete me');

  // accept the confirmation dialog
  page.on('dialog', (dialog) => dialog.accept());

  // click the delete button on the card containing our item
  const deleteBtn = await page.waitForSelector(
    'div.bg-card:has-text("delete me") button[aria-label="Delete todo"]',
  );
  await deleteBtn.click();

  // verify item disappears
  await page.waitForSelector('text=delete me', { state: 'detached' });

  // reload and verify it remains deleted
  await page.reload();
  // wait for page to fully load todos (loading indicator gone, heading visible)
  await page.waitForSelector('h1:has-text("Todo List")');
  // wait until the loading text disappears, meaning todos have been fetched
  await page.waitForFunction(
    () => !document.body.textContent?.includes('Loading...'),
  );
  const found = await page.$('text=delete me');
  expect(found).toBeNull();

  await browser.close();
}, 60000);

// --- EDIT flow tests ---

test('user can edit a todo text and it persists after reload', async () => {
  expect(composeEnv).not.toBeNull();
  const port = process.env.FRONTEND_PORT || '3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}`);

  // create a todo to edit
  await page.fill('input[placeholder="New todo"]', 'edit me');
  await page.click('button:has-text("Add")');
  await page.waitForSelector('text=edit me');

  // click the edit button on the card
  const editBtn = await page.waitForSelector(
    'div.bg-card:has-text("edit me") button[aria-label="Edit todo"]',
  );
  await editBtn.click();

  // wait for edit input to appear
  const input = await page.waitForSelector(
    'input[aria-label="Edit todo text"]',
  );
  // clear and type new text
  await input.fill('edited text');
  await input.press('Enter');

  // verify updated text displays
  await page.waitForSelector('text=edited text');

  // reload and verify persisted
  await page.reload();
  await page.waitForSelector('text=edited text');

  await browser.close();
}, 60000);

test('empty text submission is rejected and edit mode remains active', async () => {
  expect(composeEnv).not.toBeNull();
  const port = process.env.FRONTEND_PORT || '3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}`);

  await page.fill('input[placeholder="New todo"]', 'empty test');
  await page.click('button:has-text("Add")');
  await page.waitForSelector('text=empty test');

  // click edit
  const editBtn = await page.waitForSelector(
    'div.bg-card:has-text("empty test") button[aria-label="Edit todo"]',
  );
  await editBtn.click();

  // clear the input and press Enter
  const input = await page.waitForSelector(
    'input[aria-label="Edit todo text"]',
  );
  await input.fill('');
  await input.press('Enter');

  // edit mode should still be active (input still visible)
  await page.waitForSelector('input[aria-label="Edit todo text"]');

  // cancel to restore, verify original text
  await input.press('Escape');
  await page.waitForSelector('text=empty test');

  await browser.close();
}, 60000);

test('user can cancel edit with Escape and text reverts', async () => {
  expect(composeEnv).not.toBeNull();
  const port = process.env.FRONTEND_PORT || '3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}`);

  // create a todo
  await page.fill('input[placeholder="New todo"]', 'cancel test');
  await page.click('button:has-text("Add")');
  await page.waitForSelector('text=cancel test');

  // click edit
  const editBtn = await page.waitForSelector(
    'div.bg-card:has-text("cancel test") button[aria-label="Edit todo"]',
  );
  await editBtn.click();

  // modify text then press Escape
  const input = await page.waitForSelector(
    'input[aria-label="Edit todo text"]',
  );
  await input.fill('should not save');
  await input.press('Escape');

  // verify original text restored
  await page.waitForSelector('text=cancel test');
  // ensure modified text is NOT displayed
  const modified = await page.$('text=should not save');
  expect(modified).toBeNull();

  await browser.close();
}, 60000);

// --- Visual distinction tests (Story 2.7) ---

test('done items have reduced opacity and removing done status removes it', async () => {
  expect(composeEnv).not.toBeNull();
  const port = process.env.FRONTEND_PORT || '3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}`);

  // create a todo
  await page.fill('input[placeholder="New todo"]', 'opacity test');
  await page.click('button:has-text("Add")');
  await page.waitForSelector('text=opacity test');

  // verify card does NOT have opacity-60 initially (status is todo)
  const cardBefore = await page.waitForSelector(
    'div.bg-card:has-text("opacity test")',
  );
  const classBeforeDone = await cardBefore.getAttribute('class');
  expect(classBeforeDone).not.toContain('opacity-60');

  // change status to done
  await page.selectOption(
    'div.bg-card:has-text("opacity test") select[aria-label="Change todo status"]',
    'done',
  );

  // wait for opacity-60 to appear on the card (deterministic wait)
  await page.waitForFunction(() => {
    const cards = document.querySelectorAll('div.bg-card');
    for (const card of cards) {
      if (
        card.textContent?.includes('opacity test') &&
        card.className.includes('opacity-60')
      ) {
        return true;
      }
    }
    return false;
  });

  // verify card now has opacity-60
  const cardAfterDone = await page.$('div.bg-card:has-text("opacity test")');
  const classAfterDone = await cardAfterDone!.getAttribute('class');
  expect(classAfterDone).toContain('opacity-60');

  // change back to todo
  await page.selectOption(
    'div.bg-card:has-text("opacity test") select[aria-label="Change todo status"]',
    'todo',
  );

  // wait for opacity-60 to be removed (deterministic wait)
  await page.waitForFunction(() => {
    const cards = document.querySelectorAll('div.bg-card');
    for (const card of cards) {
      if (
        card.textContent?.includes('opacity test') &&
        !card.className.includes('opacity-60')
      ) {
        return true;
      }
    }
    return false;
  });

  // verify card no longer has opacity-60
  const cardAfterRevert = await page.$('div.bg-card:has-text("opacity test")');
  const classAfterRevert = await cardAfterRevert!.getAttribute('class');
  expect(classAfterRevert).not.toContain('opacity-60');

  await browser.close();
}, 60000);

// --- Empty-state tests (Story 2.8) ---

test('empty state shows when no todos exist and toggles on add/delete', async () => {
  expect(composeEnv).not.toBeNull();
  const port = process.env.FRONTEND_PORT || '3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // accept all confirmation dialogs (for delete)
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto(`http://localhost:${port}`);
  // wait for page to finish loading
  await page.waitForSelector('h1:has-text("Todo List")');
  await page.waitForFunction(
    () => !document.body.textContent?.includes('Loading...'),
  );

  // delete all existing todos to get to empty state
  while (true) {
    const deleteBtn = await page.$('button[aria-label="Delete todo"]');
    if (!deleteBtn) break;
    await deleteBtn.click();
    // deterministic wait: block until the clicked button is detached from DOM
    await deleteBtn.waitForElementState('detached');
  }

  // verify empty-state message is visible
  const emptyState = await page.waitForSelector('[data-testid="empty-state"]');
  expect(emptyState).not.toBeNull();
  const emptyText = await page.textContent('[data-testid="empty-state"]');
  expect(emptyText).toContain('No tasks yet');
  expect(emptyText).toContain('Add one above');

  // form should still be usable
  const input = await page.$('input[placeholder="New todo"]');
  expect(input).not.toBeNull();

  // create a todo — empty state should disappear
  await page.fill('input[placeholder="New todo"]', 'empty state test');
  await page.click('button:has-text("Add")');
  await page.waitForSelector('text=empty state test');

  // empty state should be gone — wait for it to detach rather than polling
  await page.waitForSelector('[data-testid="empty-state"]', {
    state: 'detached',
  });

  // delete the todo — empty state should reappear
  const delBtn = await page.waitForSelector(
    'div.bg-card:has-text("empty state test") button[aria-label="Delete todo"]',
  );
  await delBtn.click();
  await page.waitForSelector('[data-testid="empty-state"]');
  const reEmptyText = await page.textContent('[data-testid="empty-state"]');
  expect(reEmptyText).toContain('No tasks yet');

  await browser.close();
}, 60000);
