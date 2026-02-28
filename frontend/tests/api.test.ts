import { describe, it, expect, vi } from 'vitest';
import { createTodo } from '../src/api/todos';

// mock fetch globally
beforeEach(() => {
  global.fetch = vi.fn();
});

describe('API client', () => {
  it('throws descriptive error when server returns 500', async () => {
    (global.fetch as unknown as vi.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('no db'),
    });

    await expect(createTodo('test')).rejects.toThrow(
      'failed to create todo: 500 no db'
    );
  });
});
