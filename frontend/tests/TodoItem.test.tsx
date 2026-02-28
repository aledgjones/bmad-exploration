import { render, screen, fireEvent } from '@testing-library/react';
import TodoItem from '../app/components/TodoItem';
import type { Todo } from '../src/api/todos';
import { vi } from 'vitest';

describe('TodoItem component', () => {
  const baseTodo: Todo = {
    id: 1,
    text: 'task1',
    status: 'todo',
    createdAt: '',
    updatedAt: '',
  };

  it('shows text and status dropdown badge', () => {
    const mock = vi.fn();
    render(<TodoItem todo={baseTodo} onStatusChange={mock} />);
    expect(screen.getByText('task1')).toBeInTheDocument();
    const select = screen.getByLabelText(/change todo status/i);
    expect(select).toBeInTheDocument();
    // todo status should be selected and badge color class applied
    expect((select as HTMLSelectElement).value).toBe('todo');
    expect(select).toHaveClass('bg-gray-200');
  });

  it('calls callback with correct args when a new status selected', () => {
    const mock = vi.fn();
    render(<TodoItem todo={baseTodo} onStatusChange={mock} />);
    const select = screen.getByLabelText(/change todo status/i);
    fireEvent.change(select, { target: { value: 'in-progress' } });
    expect(mock).toHaveBeenCalledWith(1, 'in-progress');
  });
});
