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
    render(<TodoItem todo={baseTodo} onStatusChange={mock} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText('task1')).toBeInTheDocument();
    const select = screen.getByLabelText(/change todo status/i);
    expect(select).toBeInTheDocument();
    // todo status should be selected and badge color class applied
    expect((select as HTMLSelectElement).value).toBe('todo');
    expect(select).toHaveClass('bg-gray-200');
  });

  it('calls callback with correct args when a new status selected', () => {
    const mock = vi.fn();
    render(<TodoItem todo={baseTodo} onStatusChange={mock} onDelete={vi.fn()} onEdit={vi.fn()} />);
    const select = screen.getByLabelText(/change todo status/i);
    fireEvent.change(select, { target: { value: 'in_progress' } });
    expect(mock).toHaveBeenCalledWith(1, 'in_progress');
  });

  it.each([
    ['todo', 'bg-gray-200'],
    ['in_progress', 'bg-blue-500'],
    ['done', 'bg-green-600'],
  ])('renders badge color %s -> %s', (status, cls) => {
    const t: Todo = { ...baseTodo, status: status as any };
    render(<TodoItem todo={t} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    const select = screen.getByLabelText(/change todo status/i);
    expect(select).toHaveClass(cls);
  });

  it('falls back to error badge color for unknown status', () => {
    const t: Todo = { ...baseTodo, status: 'unknown' as any };
    render(<TodoItem todo={t} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    const select = screen.getByLabelText(/change todo status/i);
    expect(select).toHaveClass('bg-red-500');
  });

  it('renders delete button with correct aria-label', () => {
    render(<TodoItem todo={baseTodo} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    const btn = screen.getByLabelText('Delete todo');
    expect(btn).toBeInTheDocument();
  });

  it('calls onDelete when confirm accepted', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteMock = vi.fn();
    render(<TodoItem todo={baseTodo} onStatusChange={vi.fn()} onDelete={deleteMock} onEdit={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Delete todo'));
    expect(confirmSpy).toHaveBeenCalledWith('Delete this todo?');
    expect(deleteMock).toHaveBeenCalledWith(1);
    confirmSpy.mockRestore();
  });

  it('does NOT call onDelete when confirm cancelled', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const deleteMock = vi.fn();
    render(<TodoItem todo={baseTodo} onStatusChange={vi.fn()} onDelete={deleteMock} onEdit={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Delete todo'));
    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  // --- Edit mode tests ---

  it('renders edit button with correct aria-label', () => {
    render(<TodoItem todo={baseTodo} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    const btn = screen.getByLabelText('Edit todo');
    expect(btn).toBeInTheDocument();
  });

  it('enters edit mode on edit button click and shows input', () => {
    render(<TodoItem todo={baseTodo} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Edit todo'));
    const input = screen.getByLabelText('Edit todo text');
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe('task1');
  });

  it('saves on Enter key press', () => {
    const editMock = vi.fn();
    render(<TodoItem todo={baseTodo} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={editMock} />);
    fireEvent.click(screen.getByLabelText('Edit todo'));
    const input = screen.getByLabelText('Edit todo text');
    fireEvent.change(input, { target: { value: 'updated task' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(editMock).toHaveBeenCalledWith(1, 'updated task');
    // should exit edit mode
    expect(screen.queryByLabelText('Edit todo text')).not.toBeInTheDocument();
  });

  it('cancels on Escape key press', () => {
    const editMock = vi.fn();
    render(<TodoItem todo={baseTodo} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={editMock} />);
    fireEvent.click(screen.getByLabelText('Edit todo'));
    const input = screen.getByLabelText('Edit todo text');
    fireEvent.change(input, { target: { value: 'changed' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(editMock).not.toHaveBeenCalled();
    // should exit edit mode and restore original text
    expect(screen.queryByLabelText('Edit todo text')).not.toBeInTheDocument();
    expect(screen.getByText('task1')).toBeInTheDocument();
  });

  it('does NOT call onEdit for empty text', () => {
    const editMock = vi.fn();
    render(<TodoItem todo={baseTodo} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={editMock} />);
    fireEvent.click(screen.getByLabelText('Edit todo'));
    const input = screen.getByLabelText('Edit todo text');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(editMock).not.toHaveBeenCalled();
    // should stay in edit mode
    expect(screen.getByLabelText('Edit todo text')).toBeInTheDocument();
  });

  it('exits edit mode without calling onEdit when text unchanged', () => {
    const editMock = vi.fn();
    render(<TodoItem todo={baseTodo} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={editMock} />);
    fireEvent.click(screen.getByLabelText('Edit todo'));
    const input = screen.getByLabelText('Edit todo text');
    // press Enter without changing text
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(editMock).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Edit todo text')).not.toBeInTheDocument();
  });

  it('cancel button discards changes', () => {
    const editMock = vi.fn();
    render(<TodoItem todo={baseTodo} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={editMock} />);
    fireEvent.click(screen.getByLabelText('Edit todo'));
    const input = screen.getByLabelText('Edit todo text');
    fireEvent.change(input, { target: { value: 'changed' } });
    fireEvent.click(screen.getByLabelText('Cancel edit'));
    expect(editMock).not.toHaveBeenCalled();
    expect(screen.getByText('task1')).toBeInTheDocument();
  });

  it('save button submits changes', () => {
    const editMock = vi.fn();
    render(<TodoItem todo={baseTodo} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={editMock} />);
    fireEvent.click(screen.getByLabelText('Edit todo'));
    const input = screen.getByLabelText('Edit todo text');
    fireEvent.change(input, { target: { value: 'saved' } });
    fireEvent.click(screen.getByLabelText('Save edit'));
    expect(editMock).toHaveBeenCalledWith(1, 'saved');
  });

  it('exits edit mode without calling onEdit when trimmed text matches original', () => {
    const editMock = vi.fn();
    render(<TodoItem todo={baseTodo} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={editMock} />);
    fireEvent.click(screen.getByLabelText('Edit todo'));
    const input = screen.getByLabelText('Edit todo text');
    // whitespace-padded version of original — trims to the same value
    fireEvent.change(input, { target: { value: '  task1  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(editMock).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Edit todo text')).not.toBeInTheDocument();
  });

  it('action buttons (status, edit, delete) are hidden while in edit mode', () => {
    render(<TodoItem todo={baseTodo} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Edit todo'));
    expect(screen.queryByLabelText('Change todo status')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Edit todo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete todo')).not.toBeInTheDocument();
  });

  // --- Visual distinction tests (Story 2.7) ---

  it('applies opacity-60 and transition-opacity to Card when status is done', () => {
    const doneTodo: Todo = { ...baseTodo, status: 'done' };
    const { container } = render(<TodoItem todo={doneTodo} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    const card = container.querySelector('[class*="bg-card"]');
    expect(card).toHaveClass('opacity-60');
    expect(card).toHaveClass('transition-opacity');
  });

  it('does NOT apply opacity-60 to Card when status is todo', () => {
    const { container } = render(<TodoItem todo={baseTodo} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    const card = container.querySelector('[class*="bg-card"]');
    expect(card).not.toHaveClass('opacity-60');
    expect(card).toHaveClass('transition-opacity');
  });

  it('does NOT apply opacity-60 to Card when status is in_progress', () => {
    const inProgressTodo: Todo = { ...baseTodo, status: 'in_progress' };
    const { container } = render(<TodoItem todo={inProgressTodo} onStatusChange={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    const card = container.querySelector('[class*="bg-card"]');
    expect(card).not.toHaveClass('opacity-60');
    expect(card).toHaveClass('transition-opacity');
  });

});
