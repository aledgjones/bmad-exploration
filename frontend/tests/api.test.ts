import { describe, it, expect, vi } from 'vitest';
import { createTodo } from '../src/api/todos';

// mock fetch globally
beforeEach(() => {
  global.fetch = vi.fn();
});

describe('API client', () => {
  it('throws descriptive error when server returns 500', async () => {
    // cast to any since vitest.Mock type isn't directly available here
    (global.fetch as unknown as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'no db' }),
    });

    await expect(createTodo('test')).rejects.toThrow(
      'failed to create todo: 500 no db'
    );
  });
});
