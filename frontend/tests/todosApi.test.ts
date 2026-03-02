import { vi, describe, it, expect, beforeEach } from 'vitest';
import { updateTodoStatus, deleteTodo, updateTodoText } from '../src/api/todos';

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

  describe('deleteTodo', () => {
    it('sends DELETE request to correct URL', async () => {
      // @ts-ignore
      global.fetch.mockResolvedValue({ ok: true, status: 204 });
      await deleteTodo(7);
      expect(global.fetch).toHaveBeenCalledWith('/todos/7', {
        method: 'DELETE',
      });
    });

    it('throws error on non-ok response', async () => {
      // @ts-ignore
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => ({ error: 'todo not found' }),
      });
      await expect(deleteTodo(999)).rejects.toThrow(
        /failed to delete todo: 404 todo not found/
      );
    });

    it('throws generic error when json parse fails', async () => {
      // @ts-ignore
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => {
          throw new Error('bad json');
        },
      });
      await expect(deleteTodo(1)).rejects.toThrow(/failed to delete todo: 500/);
    });
  });

  describe('updateTodoText', () => {
    it('sends PATCH request with text payload', async () => {
      // @ts-ignore
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => ({
          id: 3,
          text: 'updated',
          status: 'todo',
          createdAt: '',
          updatedAt: '',
        }),
      });
      const result = await updateTodoText(3, 'updated');
      expect(global.fetch).toHaveBeenCalledWith(
        '/todos/3',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'updated' }),
        })
      );
      expect(result).toEqual({
        id: 3,
        text: 'updated',
        status: 'todo',
        createdAt: '',
        updatedAt: '',
      });
    });

    it('throws error when server responds with non-ok', async () => {
      // @ts-ignore
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => ({ error: 'text must be a non-empty string' }),
      });
      await expect(updateTodoText(1, '')).rejects.toThrow(
        /failed to update text: 400 text must be a non-empty string/
      );
    });

    it('throws generic error when json parse fails', async () => {
      // @ts-ignore
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => {
          throw new Error('bad json');
        },
      });
      await expect(updateTodoText(1, 'x')).rejects.toThrow(
        /failed to update text: 500/
      );
    });
  });
});
