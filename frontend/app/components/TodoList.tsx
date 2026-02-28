'use client';

import type { Todo } from '../../src/api/todos';
import { Card, CardContent } from '@/components/ui/card';

interface TodoListProps {
  todos: Todo[];
}

export default function TodoList({ todos }: TodoListProps) {
  if (todos.length === 0) {
    return <p className="mt-4">No todos yet.</p>;
  }

  return (
    <ul role="list" className="mt-4 w-full space-y-2">
      {todos.map((t) => (
        <li key={t.id} role="listitem">
          <Card
            className={`${t.status === 'done' ? 'line-through text-gray-500' : ''}`.trim()}
          >
            <CardContent>{t.text}</CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
