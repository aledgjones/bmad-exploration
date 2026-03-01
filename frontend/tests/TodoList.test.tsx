import { render, screen, fireEvent } from '@testing-library/react';
import TodoList from '../app/components/TodoList';
import type { Todo } from '../src/api/todos';
import { vi } from 'vitest';

describe('TodoList component', () => {
  it('renders message when there are no todos', () => {
    render(<TodoList todos={[]} onStatusChange={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/no todos yet/i)).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('renders a list of todos with appropriate roles and styles', () => {
    const items: Todo[] = [
      { id: 1, text: 'one', status: 'todo', createdAt: '', updatedAt: '' },
      { id: 2, text: 'two', status: 'done', createdAt: '', updatedAt: '' },
    ];
    const mock = vi.fn();
    render(<TodoList todos={items} onStatusChange={mock} onDelete={vi.fn()} />);
    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(3);
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
    expect(screen.getByText('one')).toBeInTheDocument();
    // section headings should be present (use heading role to avoid matching options)
    expect(screen.getByRole('heading', { name: /^📝/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^⏳/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^✅/ })).toBeInTheDocument();
    // verify 'done' status applies line-through to the 'two' item
    const twoText = screen.getByText('two');
    // the span itself should have line-through when status done
    expect(twoText).toHaveClass('line-through');
    // each item should be wrapped in a Card with bg-card
    listItems.forEach((li) => {
      const card = li.querySelector('div');
      expect(card).toHaveClass('bg-card');
    });
    // changing the status select should call the callback
    const select = screen.getAllByLabelText(/change todo status/i)[0];
    fireEvent.change(select, { target: { value: 'in_progress' } });
    expect(mock).toHaveBeenCalled();
  });
});
