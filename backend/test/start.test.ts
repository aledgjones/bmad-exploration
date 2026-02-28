import { test, expect } from 'vitest';
import { run } from '../src/start.js';

// low‑risk sanity check ensuring the CLI entrypoint exports a callable function

test('start.run is a function', () => {
  expect(typeof run).toBe('function');
});
