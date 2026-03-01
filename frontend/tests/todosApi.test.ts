import { updateTodoStatus } from '../src/api/todos';

describe('todos API client', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = vi.fn();
  });

  it('sends PATCH request with correct payload', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => ({
        id: 5,
        status: 'done',
        completedAt: '2026-03-01T00:00:00.000Z',
      }),
    });
    const result = await updateTodoStatus(5, 'done');
    expect(global.fetch).toHaveBeenCalledWith(
      '/todos/5',
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      })
    );
    expect(result).toEqual({
      id: 5,
      status: 'done',
      completedAt: '2026-03-01T00:00:00.000Z',
    });
  });

  it('returns cleared completedAt when server sends null', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => ({ id: 6, status: 'todo', completedAt: null }),
    });
    const result = await updateTodoStatus(6, 'todo');
    expect(result).toEqual({ id: 6, status: 'todo', completedAt: null });
  });

  it('throws error when server responds with non-ok', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => ({ error: 'x' }),
    });
    await expect(updateTodoStatus(1, 'todo')).rejects.toThrow(
      /failed to update status: 400 x/
    );
  });
});
