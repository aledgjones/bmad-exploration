import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { vi, type Mock } from 'vitest';
import Home from '../app/page';
import { fetchTodos, createTodo } from '../src/api/todos';

// create manual mocks for the api module
vi.mock('../src/api/todos', () => ({
  fetchTodos: vi.fn(),
  createTodo: vi.fn(),
}));

const mockedFetch = fetchTodos as unknown as Mock;
const mockedCreate = createTodo as unknown as Mock;

describe('Home page data flow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches todos on load and displays them', async () => {
    const fake = [
      { id: 1, text: 'hello', status: 'pending', createdAt: '', updatedAt: '' },
    ];
    mockedFetch.mockResolvedValue(fake);
    render(<Home />);
    expect(await screen.findByText('hello')).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
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
      status: 'pending',
      createdAt: '',
      updatedAt: '',
    };
    mockedCreate.mockResolvedValue(created);

    render(<Home />);
    const input = screen.getByPlaceholderText(/New todo/i);
    fireEvent.change(input, { target: { value: 'world' } });
    fireEvent.click(screen.getByText(/Add/i));

    expect(await screen.findByText('world')).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
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
    // restore spies to avoid leak
    alertSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
