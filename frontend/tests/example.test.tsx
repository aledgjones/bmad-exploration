import { render, screen } from '@testing-library/react';
import Home from '../app/page';

describe('Home page', () => {
    it('renders the getting started message', () => {
        render(<Home />);
        expect(
            screen.getByText(/To get started, edit the page\.tsx file\./i)
        ).toBeInTheDocument();
    });
});
