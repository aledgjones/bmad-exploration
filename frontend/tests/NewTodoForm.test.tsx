import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import NewTodoForm from '../app/components/NewTodoForm';

describe('NewTodoForm component', () => {
  it('calls onSubmit with trimmed text and clears input on success', async () => {
    const handle = vi.fn().mockResolvedValue(undefined);
    render(<NewTodoForm onSubmit={handle} />);
    const input = screen.getByPlaceholderText(/New todo/i);
    // accessibility: there should be a corresponding label even if hidden
    expect(screen.getByLabelText(/New todo description/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /Add/i });
    fireEvent.change(input, { target: { value: '  hello  ' } });
    fireEvent.click(button);

    await waitFor(() => expect(handle).toHaveBeenCalledWith('hello'));
    expect(input).toHaveValue('');
  });

  it('submits when pressing Enter key', async () => {
    const handle = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<NewTodoForm onSubmit={handle} />);
    const input = screen.getByPlaceholderText(/New todo/i);
    expect(screen.getByLabelText(/New todo description/i)).toBeInTheDocument();
    const form = container.querySelector('form')!;
    fireEvent.change(input, { target: { value: 'enter test' } });
    fireEvent.submit(form);
    await waitFor(() => expect(handle).toHaveBeenCalledWith('enter test'));
  });

  it('does not call onSubmit when input is empty or whitespace', () => {
    const handle = vi.fn();
    render(<NewTodoForm onSubmit={handle} />);
    const input = screen.getByPlaceholderText(/New todo/i);
    const button = screen.getByRole('button', { name: /Add/i });
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(button);
    expect(handle).not.toHaveBeenCalled();
  });

  it('does not clear input when onSubmit rejects', async () => {
    const handle = vi.fn().mockRejectedValue(new Error('fail'));
    render(<NewTodoForm onSubmit={handle} />);
    const input = screen.getByPlaceholderText(/New todo/i);
    const button = screen.getByRole('button', { name: /Add/i });
    fireEvent.change(input, { target: { value: 'stay' } });
    fireEvent.click(button);
    await waitFor(() => expect(handle).toHaveBeenCalledWith('stay'));
    expect(input).toHaveValue('stay');
  });

  // --- Submitting state tests (Story 2.9) ---

  it('disables button and shows "Adding..." text while submitting', async () => {
    let resolveSubmit!: (v: unknown) => void;
    const handle = vi.fn().mockReturnValue(new Promise((res) => { resolveSubmit = res; }));
    render(<NewTodoForm onSubmit={handle} />);
    const input = screen.getByPlaceholderText(/New todo/i);
    fireEvent.change(input, { target: { value: 'new todo' } });
    fireEvent.click(screen.getByRole('button', { name: /Add/i }));

    // while in flight: button shows "Adding..." and is disabled
    expect(screen.getByRole('button', { name: /Adding/i })).toBeDisabled();

    resolveSubmit(undefined);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add/i })).not.toBeDisabled();
    });
  });

  it('re-enables button after successful submission', async () => {
    const handle = vi.fn().mockResolvedValue(undefined);
    render(<NewTodoForm onSubmit={handle} />);
    const input = screen.getByPlaceholderText(/New todo/i);
    fireEvent.change(input, { target: { value: 'ok' } });
    fireEvent.click(screen.getByRole('button', { name: /Add/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add/i })).not.toBeDisabled();
    });
  });

  it('re-enables button after failed submission', async () => {
    const handle = vi.fn().mockRejectedValue(new Error('fail'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    render(<NewTodoForm onSubmit={handle} />);
    const input = screen.getByPlaceholderText(/New todo/i);
    fireEvent.change(input, { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: /Add/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add/i })).not.toBeDisabled();
    });
    errorSpy.mockRestore();
  });

  it('double-click does not trigger multiple onSubmit calls', async () => {
    let resolveSubmit!: (v: unknown) => void;
    const handle = vi.fn().mockReturnValue(new Promise((res) => { resolveSubmit = res; }));
    render(<NewTodoForm onSubmit={handle} />);
    const input = screen.getByPlaceholderText(/New todo/i);
    const button = screen.getByRole('button', { name: /Add/i });
    fireEvent.change(input, { target: { value: 'once' } });

    // click twice quickly
    fireEvent.click(button);
    fireEvent.click(button);

    expect(handle).toHaveBeenCalledTimes(1);

    resolveSubmit(undefined);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add/i })).not.toBeDisabled();
    });
  });
});
