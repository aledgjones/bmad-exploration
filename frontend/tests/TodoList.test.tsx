import { render, screen } from '@testing-library/react';
import TodoList from '../app/components/TodoList';
import type { Todo } from '../src/api/todos';

describe('TodoList component', () => {
  it('renders message when there are no todos', () => {
    render(<TodoList todos={[]} />);
    expect(screen.getByText(/no todos yet/i)).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('renders a list of todos with appropriate roles and styles', () => {
    const items: Todo[] = [
      { id: 1, text: 'one', status: 'pending', createdAt: '', updatedAt: '' },
      { id: 2, text: 'two', status: 'done', createdAt: '', updatedAt: '' },
    ];
    render(<TodoList todos={items} />);
    expect(screen.getByRole('list')).toBeInTheDocument();
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
    expect(screen.getByText('one')).toBeInTheDocument();
    // verify 'done' status applies line-through at card wrapper level
    const doneCard = listItems[1].querySelector('div');
    expect(doneCard).toHaveClass('line-through');
    // each item should be wrapped in a Card with bg-card
    listItems.forEach((li) => {
      const card = li.querySelector('div');
      expect(card).toHaveClass('bg-card');
    });
  });
});
