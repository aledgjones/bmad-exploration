import { render, screen } from '@testing-library/react';
import Spinner from '../app/components/Spinner';

describe('Spinner component', () => {
    it('renders with default label "Loading"', () => {
        render(<Spinner />);
        const status = screen.getByRole('status');
        expect(status).toBeInTheDocument();
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders with a custom label', () => {
        render(<Spinner label="Loading todos" />);
        const status = screen.getByRole('status');
        expect(status).toBeInTheDocument();
        expect(screen.getByText('Loading todos...')).toBeInTheDocument();
    });

    it('has role="status" for screen reader live region', () => {
        render(<Spinner label="Please wait" />);
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('SVG has aria-hidden="true" to prevent graphic from being announced', () => {
        const { container } = render(<Spinner />);
        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('contains an animate-spin SVG for visual feedback', () => {
        const { container } = render(<Spinner />);
        const svg = container.querySelector('svg');
        expect(svg).toHaveClass('animate-spin');
    });
});
