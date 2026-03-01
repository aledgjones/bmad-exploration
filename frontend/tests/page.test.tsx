import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { vi, type Mock } from 'vitest';
import Home from '../app/page';
import { fetchTodos, createTodo, updateTodoStatus } from '../src/api/todos';

// create manual mocks for the api module
vi.mock('../src/api/todos', () => ({
  fetchTodos: vi.fn(),
  createTodo: vi.fn(),
  updateTodoStatus: vi.fn(),
}));

const mockedFetch = fetchTodos as unknown as Mock;
const mockedCreate = createTodo as unknown as Mock;
const mockedUpdate = updateTodoStatus as unknown as Mock;

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

  it('alerts if initial fetch fails', async () => {
    mockedFetch.mockRejectedValue(new Error('network'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
    render(<Home />);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Unable to load todos. Is the backend running?'
      );
    });
    alertSpy.mockRestore();
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

  it('alerts when creation fails', async () => {
    mockedFetch.mockResolvedValue([]);
    mockedCreate.mockRejectedValue(
      new Error('failed to create todo: 500 database not initialized')
    );
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    render(<Home />);
    const input = screen.getByPlaceholderText(/New todo/i);
    fireEvent.change(input, { target: { value: 'oops' } });
    await act(async () => {
      fireEvent.click(screen.getByText(/Add/i));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Unable to add todo. Is the backend running?'
      );
    });
    expect(screen.getByPlaceholderText(/New todo/i)).toHaveValue('oops');

    alertSpy.mockRestore();
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

  it('rolls back status on update failure', async () => {
    const todo = { id: 1, text: 'hi', status: 'todo', createdAt: '', updatedAt: '' };
    // first fetch returns todo, second fetch (rollback) returns original
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
  });
});
