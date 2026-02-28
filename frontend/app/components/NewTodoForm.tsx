'use client';

import { FormEvent, useState } from 'react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

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
      <Input
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
