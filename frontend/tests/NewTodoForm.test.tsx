import { render, screen, fireEvent } from '@testing-library/react';
import NewTodoForm from '../app/components/NewTodoForm';

describe('NewTodoForm component', () => {
    it('calls onSubmit with trimmed text and clears input', () => {
        const handle = vi.fn();
        render(<NewTodoForm onSubmit={handle} />);
        const input = screen.getByPlaceholderText(/New todo/i);
        const button = screen.getByRole('button', { name: /Add/i });
        fireEvent.change(input, { target: { value: '  hello  ' } });
        fireEvent.click(button);
        expect(handle).toHaveBeenCalledWith('hello');
        expect(input).toHaveValue('');
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
});
