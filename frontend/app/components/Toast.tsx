'use client';

import { useEffect } from 'react';

interface ToastProps {
    id: number;
    message: string;
    onDismiss: (id: number) => void;
    duration?: number;
}

export default function Toast({
    id,
    message,
    onDismiss,
    duration = 5000,
}: ToastProps) {
    useEffect(() => {
        // stable: onDismiss is memoized in parent; id never changes for this instance
        const timer = setTimeout(() => onDismiss(id), duration);
        return () => clearTimeout(timer);
    }, [id, onDismiss, duration]);

    return (
        // role="status" already implies aria-live="polite" — no need to duplicate
        <div
            role="status"
            className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-3 rounded-md shadow-lg flex items-center gap-2 z-50"
            data-testid="toast"
        >
            <span className="text-sm">{message}</span>
            <button
                onClick={() => onDismiss(id)}
                aria-label="Dismiss notification"
                className="ml-2 text-sm font-bold hover:opacity-80 cursor-pointer"
            >
                ×
            </button>
        </div>
    );
}
