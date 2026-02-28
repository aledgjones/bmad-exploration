'use client';

import { FormEvent, useState } from 'react';

interface NewTodoFormProps {
    onSubmit: (text: string) => void;
}

export default function NewTodoForm({ onSubmit }: NewTodoFormProps) {
    const [text, setText] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (trimmed) {
            onSubmit(trimmed);
            setText('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-lg">
            <input
                type="text"
                placeholder="New todo"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-grow border p-2 rounded"
                data-testid="new-todo-input"
            />
            <button
                type="submit"
                className="bg-blue-500 text-white px-4 rounded"
                data-testid="new-todo-submit"
            >
                Add
            </button>
        </form>
    );
}
