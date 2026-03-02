import { render, screen, fireEvent } from '@testing-library/react';
import TodoList from '../app/components/TodoList';
import type { Todo } from '../src/api/todos';
import { vi } from 'vitest';

describe('TodoList component', () => {
  it('renders empty-state with icon and message when there are no todos', () => {
    render(<TodoList todos={[]} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    // data-testid container exists
    const container = screen.getByTestId('empty-state');
    expect(container).toBeInTheDocument();
    // emoji icon with role="img" — aria-label must match visible heading text
    const icon = screen.getByRole('img', { name: /no tasks yet/i });
    expect(icon).toBeInTheDocument();
    expect(icon.textContent).toBe('📋');
    // primary message
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
    // secondary hint
    expect(screen.getByText(/add one above to get started/i)).toBeInTheDocument();
    // layout classes — centering and spacing must all be present
    expect(container).toHaveClass('text-center');
    expect(container).toHaveClass('flex');
    expect(container).toHaveClass('flex-col');
    expect(container).toHaveClass('items-center');
    expect(container).toHaveClass('justify-center');
    expect(container).toHaveClass('py-12');
    expect(container).toHaveClass('mt-8');
    // no list items rendered
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('renders a list of todos with appropriate roles and styles', () => {
    const items: Todo[] = [
      { id: 1, text: 'one', status: 'todo', createdAt: '', updatedAt: '' },
      { id: 2, text: 'two', status: 'done', createdAt: '', updatedAt: '' },
    ];
    const mock = vi.fn();
    render(<TodoList todos={items} onStatusChange={mock} onDelete={vi.fn()} onEdit={vi.fn()} />);
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

  // --- Visual distinction tests (Story 2.7) ---

  it('done items have opacity-60 on Card, active items do not', () => {
    const items: Todo[] = [
      { id: 1, text: 'active task', status: 'todo', createdAt: '', updatedAt: '' },
      { id: 2, text: 'progress task', status: 'in_progress', createdAt: '', updatedAt: '' },
      { id: 3, text: 'done task', status: 'done', createdAt: '', updatedAt: '' },
    ];
    render(<TodoList todos={items} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);

    // done item card should have opacity-60
    const doneCard = screen.getByText('done task').closest('[class*="bg-card"]');
    expect(doneCard).toHaveClass('opacity-60');

    // active items should NOT have opacity-60
    const activeCard = screen.getByText('active task').closest('[class*="bg-card"]');
    expect(activeCard).not.toHaveClass('opacity-60');

    const progressCard = screen.getByText('progress task').closest('[class*="bg-card"]');
    expect(progressCard).not.toHaveClass('opacity-60');
  });
});
