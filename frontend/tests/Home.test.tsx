import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '../app/page';
import type { Todo, TodoStatus } from '../src/api/todos';
import { vi } from 'vitest';

// mock the api module
vi.mock('../src/api/todos', () => {
    return {
        fetchTodos: vi.fn(),
        createTodo: vi.fn(),
        updateTodoStatus: vi.fn(),
        deleteTodo: vi.fn(),
        TodoStatus: {},
    };
});

import { fetchTodos, updateTodoStatus } from '../src/api/todos';

describe('Home page status change behaviour', () => {
    const initialTodos: Todo[] = [
        { id: 1, text: 'first', status: 'todo', createdAt: '', updatedAt: '' },
    ];

    beforeEach(() => {
        (fetchTodos as any).mockResolvedValue(initialTodos);
        (updateTodoStatus as any).mockClear();
    });

    it('reverts optimistic change when API call fails', async () => {
        // simulate network error
        (updateTodoStatus as any).mockRejectedValue(new Error('network'));

        render(<Home />);
        // wait for initial load
        await waitFor(() => expect(fetchTodos).toHaveBeenCalled());
        expect(screen.getByText('first')).toBeInTheDocument();
        const select = screen.getByLabelText(/change todo status/i);
        // change status to in_progress
        fireEvent.change(select, { target: { value: 'in_progress' } });
        // optimistic update should reflect immediately
        expect((select as HTMLSelectElement).value).toBe('in_progress');

        // wait for promise rejection & rollback (re-query select element)
        await waitFor(() => {
            const current = screen.getByLabelText(/change todo status/i);
            expect((current as HTMLSelectElement).value).toBe('todo');
        });
    });
});
