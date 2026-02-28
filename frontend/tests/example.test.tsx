import { render, screen } from '@testing-library/react';
import Home from '../app/page';

describe('Home page', () => {
  beforeEach(() => {
    // mock fetch for list
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as any)
    );
  });

  it('shows todo list header and form', async () => {
    render(<Home />);
    expect(screen.getByText(/Todo List/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/New todo/i)).toBeInTheDocument();
    // await loading to finish
    expect(await screen.findByText(/Add/)).toBeInTheDocument();
  });
});
