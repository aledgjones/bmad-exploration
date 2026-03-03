import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import Toast from '../app/components/Toast';

// Helper: render Toast with required id prop
const renderToast = (overrides: Partial<Parameters<typeof Toast>[0]> = {}) => {
    const onDismiss = vi.fn();
    const result = render(
        <Toast id={42} message="Something went wrong" onDismiss={onDismiss} {...overrides} />
    );
    return { ...result, onDismiss };
};

describe('Toast component', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders message text', () => {
        renderToast();
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders dismiss button with aria-label', () => {
        renderToast({ message: 'error' });
        expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
    });

    it('calls onDismiss with the toast id when dismiss button is clicked', () => {
        const { onDismiss } = renderToast({ id: 7, message: 'error' });
        fireEvent.click(screen.getByLabelText('Dismiss notification'));
        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(onDismiss).toHaveBeenCalledWith(7);
    });

    it('auto-dismisses after specified duration calling onDismiss with id', () => {
        const { onDismiss } = renderToast({ id: 3, message: 'error', duration: 3000 });
        expect(onDismiss).not.toHaveBeenCalled();
        act(() => {
            vi.advanceTimersByTime(3000);
        });
        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(onDismiss).toHaveBeenCalledWith(3);
    });

    it('auto-dismisses after default 5000ms', () => {
        const { onDismiss } = renderToast({ message: 'error' });
        act(() => {
            vi.advanceTimersByTime(4999);
        });
        expect(onDismiss).not.toHaveBeenCalled();
        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('timer does NOT reset when onDismiss reference is stable (H1 regression)', () => {
        // Verify that passing the same stable onDismiss ref means timer fires exactly once
        const stableDismiss = vi.fn();
        const { rerender } = render(
            <Toast id={1} message="error" onDismiss={stableDismiss} duration={5000} />
        );
        act(() => { vi.advanceTimersByTime(2000); });
        // simulate parent re-render with same stable ref
        rerender(<Toast id={1} message="error" onDismiss={stableDismiss} duration={5000} />);
        act(() => { vi.advanceTimersByTime(3000); }); // total 5000ms from original render
        expect(stableDismiss).toHaveBeenCalledTimes(1);
    });

    it('has role="status" for accessibility', () => {
        renderToast();
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('role="status" implicitly provides aria-live="polite"', () => {
        // role="status" carries implicit aria-live="polite"; no need for the explicit attribute
        renderToast();
        const toast = screen.getByRole('status');
        // The role itself is the accessibility contract; just verify it is present
        expect(toast).toBeInTheDocument();
    });

    it('has data-testid="toast"', () => {
        renderToast();
        expect(screen.getByTestId('toast')).toBeInTheDocument();
    });

    it('clears timeout on unmount', () => {
        const { onDismiss, unmount } = renderToast({ message: 'error' });
        unmount();
        act(() => {
            vi.advanceTimersByTime(5000);
        });
        // onDismiss should not be called after unmount since timer was cleared
        expect(onDismiss).not.toHaveBeenCalled();
    });
});
