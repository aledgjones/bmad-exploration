import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { vi, type Mock } from 'vitest';
import Home from '../app/page';
import { fetchTodos, createTodo, updateTodoStatus, updateTodoText, deleteTodo } from '../src/api/todos';

// create manual mocks for the api module
vi.mock('../src/api/todos', () => ({
  fetchTodos: vi.fn(),
  createTodo: vi.fn(),
  updateTodoStatus: vi.fn(),
  updateTodoText: vi.fn(),
  deleteTodo: vi.fn(),
}));

const mockedFetch = fetchTodos as unknown as Mock;
const mockedCreate = createTodo as unknown as Mock;
const mockedUpdate = updateTodoStatus as unknown as Mock;
const mockedUpdateText = updateTodoText as unknown as Mock;
const mockedDelete = deleteTodo as unknown as Mock;

describe('Home page data flow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches todos on load and displays them', async () => {
    const fake = [
      { id: 1, text: 'hello', status: 'todo', createdAt: '', updatedAt: '' },
    ];
    mockedFetch.mockResolvedValue(fake);
    render(<Home />);
    expect(await screen.findByText('hello')).toBeInTheDocument();
    // component renders three empty lists (one per status) – ensure we at least have them
    expect(screen.getAllByRole('list')).toHaveLength(3);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    // page outer div should use grey background class
    const root = screen.getByTestId('page-root');
    expect(root).toHaveClass('bg-gray-100');
  });

  it('shows inline error state when initial fetch fails', async () => {
    mockedFetch.mockRejectedValue(new Error('network'));
    render(<Home />);
    // error state should appear
    expect(await screen.findByTestId('error-state')).toBeInTheDocument();
    expect(screen.getByText('Unable to load todos. Is the backend running?')).toBeInTheDocument();
    // retry button present
    expect(screen.getByLabelText('Retry loading todos')).toBeInTheDocument();
    // spinner should be removed after fetch failure
    expect(screen.queryByText('Loading todos...')).not.toBeInTheDocument();
    // error container has role="alert" for screen reader announcement
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('clicking Retry re-fetches and shows loading then todo list on success', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('network'));
    render(<Home />);
    // wait for error state
    expect(await screen.findByTestId('error-state')).toBeInTheDocument();

    // setup successful retry
    const fakeTodos = [{ id: 1, text: 'retried', status: 'todo', createdAt: '', updatedAt: '' }];
    mockedFetch.mockResolvedValueOnce(fakeTodos);

    fireEvent.click(screen.getByLabelText('Retry loading todos'));

    // after retry succeeds, error state gone and todo list visible
    expect(await screen.findByText('retried')).toBeInTheDocument();
    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });

  it('clicking Retry shows error again if re-fetch also fails', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('network'));
    render(<Home />);
    expect(await screen.findByTestId('error-state')).toBeInTheDocument();

    // retry also fails
    mockedFetch.mockRejectedValueOnce(new Error('still down'));
    fireEvent.click(screen.getByLabelText('Retry loading todos'));

    // error state should remain
    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });
    expect(screen.getByText('Unable to load todos. Is the backend running?')).toBeInTheDocument();
  });

  it('creates a new todo and prepends to list', async () => {
    mockedFetch.mockResolvedValue([]);
    const created = {
      id: 2,
      text: 'world',
      status: 'todo',
      createdAt: '',
      updatedAt: '',
    };
    mockedCreate.mockResolvedValue(created);

    render(<Home />);
    const input = screen.getByPlaceholderText(/New todo/i);
    fireEvent.change(input, { target: { value: 'world' } });
    fireEvent.click(screen.getByText(/Add/i));

    expect(await screen.findByText('world')).toBeInTheDocument();
    expect(screen.getAllByRole('list')).toHaveLength(3);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('shows toast when creation fails', async () => {
    mockedFetch.mockResolvedValue([]);
    mockedCreate.mockRejectedValue(
      new Error('failed to create todo: 500 database not initialized')
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    render(<Home />);
    const input = screen.getByPlaceholderText(/New todo/i);
    fireEvent.change(input, { target: { value: 'oops' } });
    await act(async () => {
      fireEvent.click(screen.getByText(/Add/i));
    });

    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument();
      expect(screen.getByText('Unable to add todo. Is the backend running?')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText(/New todo/i)).toHaveValue('oops');

    errorSpy.mockRestore();
  });

  it('optimistically updates status and persists on success', async () => {
    const todo = { id: 1, text: 'hi', status: 'todo', createdAt: '', updatedAt: '' };
    mockedFetch.mockResolvedValue([todo]);
    mockedUpdate.mockResolvedValue({ ...todo, status: 'done' });

    render(<Home />);
    expect(await screen.findByText('hi')).toBeInTheDocument();
    const select = screen.getByLabelText(/change todo status/i);
    fireEvent.change(select, { target: { value: 'done' } });

    // optimistic change should reflect immediately
    expect((select as HTMLSelectElement).value).toBe('done');
    expect(mockedUpdate).toHaveBeenCalledWith(1, 'done');
  });

  it('reverts from done back to another status and clears completed styling', async () => {
    const todo = { id: 3, text: 'cycle', status: 'todo', createdAt: '', updatedAt: '' };
    mockedFetch.mockResolvedValue([todo]);
    // first call for done, second call for todo
    mockedUpdate
      .mockResolvedValueOnce({ ...todo, status: 'done' })
      .mockResolvedValueOnce({ ...todo, status: 'todo' });

    render(<Home />);
    expect(await screen.findByText('cycle')).toBeInTheDocument();
    let select = screen.getByLabelText(/change todo status/i);
    fireEvent.change(select, { target: { value: 'done' } });
    expect(mockedUpdate).toHaveBeenCalledWith(3, 'done');
    // wait for the first update to resolve and re-render
    await waitFor(() => {
      expect(screen.getByLabelText(/change todo status/i)).toHaveValue('done');
    });
    // re-query select after re-render
    select = screen.getByLabelText(/change todo status/i);
    // simulate next change back to todo
    fireEvent.change(select, { target: { value: 'todo' } });
    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledTimes(2);
      expect(mockedUpdate).toHaveBeenLastCalledWith(3, 'todo');
    });
    // after revert, select value should reflect todo
    await waitFor(() => {
      expect(screen.getByLabelText(/change todo status/i)).toHaveValue('todo');
    });
  });

  it('rolls back status on update failure and shows toast', async () => {
    const todo = { id: 1, text: 'hi', status: 'todo', createdAt: '', updatedAt: '' };
    mockedFetch.mockResolvedValueOnce([todo]).mockResolvedValueOnce([todo]);
    mockedUpdate.mockRejectedValue(new Error('fail'));

    render(<Home />);
    expect(await screen.findByText('hi')).toBeInTheDocument();
    const select = screen.getByLabelText(/change todo status/i);
    fireEvent.change(select, { target: { value: 'done' } });
    expect((select as HTMLSelectElement).value).toBe('done');

    await waitFor(() => {
      expect(screen.getByLabelText(/change todo status/i)).toHaveValue('todo');
    });
    // toast shown instead of alert
    expect(screen.getByTestId('toast')).toBeInTheDocument();
    expect(screen.getByText('Unable to update status')).toBeInTheDocument();
  });

  it('optimistically removes todo on delete and calls API', async () => {
    const todos = [
      { id: 1, text: 'first', status: 'todo', createdAt: '', updatedAt: '' },
      { id: 2, text: 'second', status: 'todo', createdAt: '', updatedAt: '' },
    ];
    mockedFetch.mockResolvedValue(todos);
    mockedDelete.mockResolvedValue(undefined);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<Home />);
    expect(await screen.findByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();

    // click delete on the first item
    const deleteButtons = screen.getAllByLabelText('Delete todo');
    fireEvent.click(deleteButtons[0]);

    // item should be optimistically removed
    await waitFor(() => {
      expect(screen.queryByText('first')).not.toBeInTheDocument();
    });
    expect(screen.getByText('second')).toBeInTheDocument();
    expect(mockedDelete).toHaveBeenCalledWith(1);

    confirmSpy.mockRestore();
  });

  it('restores todo on delete failure and shows toast', async () => {
    const todos = [
      { id: 1, text: 'keeper', status: 'todo', createdAt: '', updatedAt: '' },
    ];
    mockedFetch.mockResolvedValue(todos);
    mockedDelete.mockRejectedValue(new Error('network error'));
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<Home />);
    expect(await screen.findByText('keeper')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Delete todo'));

    // item should momentarily disappear then reappear
    await waitFor(() => {
      expect(screen.getByText('keeper')).toBeInTheDocument();
    });
    // toast shown instead of alert
    expect(screen.getByTestId('toast')).toBeInTheDocument();
    expect(screen.getByText('Unable to delete todo')).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('does not delete when confirm is cancelled', async () => {
    const todos = [
      { id: 1, text: 'stay', status: 'todo', createdAt: '', updatedAt: '' },
    ];
    mockedFetch.mockResolvedValue(todos);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<Home />);
    expect(await screen.findByText('stay')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Delete todo'));

    // item should still be present
    expect(screen.getByText('stay')).toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('optimistically updates text on edit and reconciles on success', async () => {
    const todo = { id: 1, text: 'original', status: 'todo', createdAt: '', updatedAt: '' };
    mockedFetch.mockResolvedValue([todo]);
    mockedUpdateText.mockResolvedValue({ ...todo, text: 'edited', updatedAt: '2026-03-01' });

    render(<Home />);
    expect(await screen.findByText('original')).toBeInTheDocument();

    // click edit button, change text, save
    fireEvent.click(screen.getByLabelText('Edit todo'));
    const input = screen.getByLabelText('Edit todo text');
    fireEvent.change(input, { target: { value: 'edited' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // optimistic — text updated immediately
    expect(screen.getByText('edited')).toBeInTheDocument();
    expect(mockedUpdateText).toHaveBeenCalledWith(1, 'edited');

    // wait for async reconcile to settle (avoids act() warning from pending state update)
    await waitFor(() => expect(mockedUpdateText).toHaveBeenCalledTimes(1));
  });

  it('rolls back text on edit failure and shows toast', async () => {
    const todo = { id: 1, text: 'original', status: 'todo', createdAt: '', updatedAt: '' };
    mockedFetch.mockResolvedValue([todo]);
    mockedUpdateText.mockRejectedValue(new Error('fail'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    render(<Home />);
    expect(await screen.findByText('original')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Edit todo'));
    const input = screen.getByLabelText('Edit todo text');
    fireEvent.change(input, { target: { value: 'bad edit' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // optimistic update shows new text
    expect(screen.getByText('bad edit')).toBeInTheDocument();

    // after failure, text reverts and toast shown
    await waitFor(() => {
      expect(screen.getByText('original')).toBeInTheDocument();
    });
    expect(screen.getByTestId('toast')).toBeInTheDocument();
    expect(screen.getByText('Unable to update todo')).toBeInTheDocument();

    errorSpy.mockRestore();
  });

  // --- Loading spinner tests (Story 2.9) ---

  it('shows spinner with role="status" during initial fetch', async () => {
    let resolveLoad!: (v: any[]) => void;
    mockedFetch.mockReturnValue(new Promise<any[]>((res) => { resolveLoad = res; }));
    render(<Home />);
    // before fetch resolves: spinner present
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading todos...')).toBeInTheDocument();
    // resolve the fetch
    resolveLoad([]);
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('sets aria-busy on main during loading and removes it after', async () => {
    let resolveLoad!: (v: any[]) => void;
    mockedFetch.mockReturnValue(new Promise<any[]>((res) => { resolveLoad = res; }));
    render(<Home />);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('aria-busy', 'true');
    resolveLoad([]);
    await waitFor(() => {
      expect(main).toHaveAttribute('aria-busy', 'false');
    });
  });

  it('spinner disappears and list renders once fetch completes', async () => {
    const fake = [{ id: 1, text: 'ready', status: 'todo', createdAt: '', updatedAt: '' }];
    mockedFetch.mockResolvedValue(fake);
    render(<Home />);
    // spinner goes away and todo is visible
    await waitFor(() => {
      expect(screen.queryByText('Loading todos...')).not.toBeInTheDocument();
    });
    expect(screen.getByText('ready')).toBeInTheDocument();
  });

  // --- Empty-state tests (Story 2.8) ---

  it('empty-state is NOT shown while loading is in progress (L3)', async () => {
    // fetchTodos never resolves — loading state persists indefinitely
    mockedFetch.mockReturnValue(new Promise<never>(() => { }));
    render(<Home />);
    // Loading spinner should be visible
    expect(screen.getByText('Loading todos...')).toBeInTheDocument();
    // empty-state must NOT be visible during loading
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('shows empty-state and form when no todos exist (AC 1, 2, 3)', async () => {
    mockedFetch.mockResolvedValue([]);
    render(<Home />);
    // wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading todos...')).not.toBeInTheDocument();
    });
    // empty-state container visible
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
    expect(screen.getByText(/add one above/i)).toBeInTheDocument();
    // form input and button remain visible
    expect(screen.getByPlaceholderText(/new todo/i)).toBeInTheDocument();
    expect(screen.getByTestId('new-todo-submit')).toBeInTheDocument();
  });

  it('empty state disappears when first todo is added (AC 4)', async () => {
    mockedFetch.mockResolvedValue([]);
    const created = { id: 1, text: 'first', status: 'todo', createdAt: '', updatedAt: '' };
    mockedCreate.mockResolvedValue(created);

    render(<Home />);
    await waitFor(() => {
      expect(screen.queryByText('Loading todos...')).not.toBeInTheDocument();
    });
    // empty state present initially
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();

    // add a todo
    const input = screen.getByPlaceholderText(/new todo/i);
    fireEvent.change(input, { target: { value: 'first' } });
    fireEvent.click(screen.getByTestId('new-todo-submit'));

    // empty state disappears, todo appears
    await waitFor(() => {
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    });
    expect(screen.getByText('first')).toBeInTheDocument();
  });

  it('empty state reappears when last todo is deleted (AC 5)', async () => {
    const todos = [
      { id: 1, text: 'only', status: 'todo', createdAt: '', updatedAt: '' },
    ];
    mockedFetch.mockResolvedValue(todos);
    mockedDelete.mockResolvedValue(undefined);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<Home />);
    expect(await screen.findByText('only')).toBeInTheDocument();
    // no empty state when there are todos
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();

    // delete the last todo
    fireEvent.click(screen.getByLabelText('Delete todo'));

    // empty state reappears
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  // --- Story 2.11: Optimistic update verification tests ---

  it('todo appears after createTodo resolves (create intentionally awaits server-assigned id)', async () => {
    mockedFetch.mockResolvedValue([]);
    let resolveCreate!: (value: any) => void;
    mockedCreate.mockReturnValue(new Promise((r) => { resolveCreate = r; }));

    render(<Home />);
    await screen.findByTestId('page-root');

    const input = screen.getByPlaceholderText(/New todo/i);
    fireEvent.change(input, { target: { value: 'instant' } });
    fireEvent.click(screen.getByTestId('new-todo-submit'));

    // todo not yet visible — handleAdd awaits createTodo before updating state (server assigns id)
    expect(screen.queryByText('instant')).not.toBeInTheDocument();

    // once resolved the todo appears
    resolveCreate({ id: 99, text: 'instant', status: 'todo', createdAt: '', updatedAt: '' });
    expect(await screen.findByText('instant')).toBeInTheDocument();
  });

  it('status change reflects BEFORE updateTodoStatus resolves', async () => {
    const todo = { id: 1, text: 'test', status: 'todo', createdAt: '', updatedAt: '' };
    mockedFetch.mockResolvedValue([todo]);
    let resolveUpdate!: (value: any) => void;
    mockedUpdate.mockReturnValue(new Promise((r) => { resolveUpdate = r; }));

    render(<Home />);
    await screen.findByText('test');

    const select = screen.getByLabelText(/change todo status/i);
    fireEvent.change(select, { target: { value: 'done' } });

    // UI updates IMMEDIATELY — API has NOT resolved yet
    expect((select as HTMLSelectElement).value).toBe('done');

    // cleanup: resolve to avoid dangling state update
    resolveUpdate({ id: 1, text: 'test', status: 'done', createdAt: '', updatedAt: '2026-03-03', completedAt: '2026-03-03' });
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1));
  });

  it('text edit reflects BEFORE updateTodoText resolves', async () => {
    const todo = { id: 1, text: 'original', status: 'todo', createdAt: '', updatedAt: '' };
    mockedFetch.mockResolvedValue([todo]);
    let resolveText!: (value: any) => void;
    mockedUpdateText.mockReturnValue(new Promise((r) => { resolveText = r; }));

    render(<Home />);
    await screen.findByText('original');

    fireEvent.click(screen.getByLabelText('Edit todo'));
    const input = screen.getByLabelText('Edit todo text');
    fireEvent.change(input, { target: { value: 'updated text' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // UI updates IMMEDIATELY — API has NOT resolved yet
    expect(screen.getByText('updated text')).toBeInTheDocument();

    // cleanup: resolve to avoid dangling state update
    resolveText({ id: 1, text: 'updated text', status: 'todo', createdAt: '', updatedAt: '2026-03-03' });
    await waitFor(() => expect(mockedUpdateText).toHaveBeenCalledTimes(1));
  });

  it('todo disappears BEFORE deleteTodo resolves', async () => {
    const todos = [{ id: 1, text: 'to-delete', status: 'todo', createdAt: '', updatedAt: '' }];
    mockedFetch.mockResolvedValue(todos);
    let resolveDelete!: (value: any) => void;
    mockedDelete.mockReturnValue(new Promise((r) => { resolveDelete = r; }));
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<Home />);
    await screen.findByText('to-delete');

    fireEvent.click(screen.getByLabelText('Delete todo'));

    // UI removes IMMEDIATELY — API has NOT resolved yet
    expect(screen.queryByText('to-delete')).not.toBeInTheDocument();

    // cleanup
    resolveDelete(undefined);
    await waitFor(() => expect(mockedDelete).toHaveBeenCalledTimes(1));
    confirmSpy.mockRestore();
  });

  it('reconciles server response timestamps after status update success', async () => {
    const todo = { id: 1, text: 'hi', status: 'todo', createdAt: '2026-01-01', updatedAt: '2026-01-01' };
    mockedFetch.mockResolvedValue([todo]);
    const serverResponse = {
      ...todo,
      status: 'done',
      completedAt: '2026-03-03T12:00:00Z',
      updatedAt: '2026-03-03T12:00:00Z',
    };
    mockedUpdate.mockResolvedValue(serverResponse);

    render(<Home />);
    await screen.findByText('hi');

    fireEvent.change(screen.getByLabelText(/change todo status/i), {
      target: { value: 'done' },
    });

    // wait for API call and reconciliation to complete
    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith(1, 'done');
    });
    // status remains 'done' after server reconciliation
    expect(screen.getByLabelText(/change todo status/i)).toHaveValue('done');
  });

  // --- Story 2.12: No onboarding test ---

  it('does not render onboarding or help text (AC 5)', async () => {
    mockedFetch.mockResolvedValue([]);
    render(<Home />);
    await waitFor(() => expect(mockedFetch).toHaveBeenCalled());
    expect(
      screen.queryByText(/help|tutorial|onboarding|how to|getting started/i),
    ).not.toBeInTheDocument();
  });

});
