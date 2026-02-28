'use client';

import { FormEvent, useState } from 'react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

interface NewTodoFormProps {
  /**
   * Called when the user submits a new todo. May return a promise.  If the
   * promise resolves (or the function returns normally) the form will clear
   * itself.  If it rejects, the current text remains so the user can retry.
   */
  onSubmit: (text: string) => Promise<unknown> | void;
}

export default function NewTodoForm({ onSubmit }: NewTodoFormProps) {
  const [text, setText] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      await onSubmit(trimmed);
      setText('');
    } catch (err) {
      // keep text so user can retry; error handling should be done by caller
      console.error('NewTodoForm onSubmit failed', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-lg">
      <label htmlFor="new-todo-input" className="sr-only">
        New todo description
      </label>
      <Input
        id="new-todo-input"
        type="text"
        placeholder="New todo"
        value={text}
        onChange={(e) => setText(e.target.value)}
        data-testid="new-todo-input"
      />
      <Button type="submit" data-testid="new-todo-submit">
        Add
      </Button>
    </form>
  );
}
