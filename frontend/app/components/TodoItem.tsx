'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { Todo } from '../../src/api/todos';

interface TodoItemProps {
  todo: Todo;
  onStatusChange: (id: number, status: string) => void;
}

const statusOptions: { value: string; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

function badgeColor(status: string) {
  switch (status) {
    case 'todo':
      return 'bg-gray-200 text-gray-900';
    case 'in-progress':
      return 'bg-blue-500 text-white';
    case 'done':
      return 'bg-green-600 text-white';
    default:
      return 'bg-gray-200 text-gray-900';
  }
}

export default function TodoItem({ todo, onStatusChange }: TodoItemProps) {
  return (
    <Card>
      <CardContent className="flex justify-between items-center">
        <span
          className={`${todo.status === 'done' ? 'line-through text-gray-500' : ''}`.trim()}
        >
          {todo.text}
        </span>
        <select
          aria-label="Change todo status"
          value={todo.status}
          onChange={(e) => onStatusChange(todo.id, e.target.value)}
          className={`px-4 py-1 text-xs text-center rounded-full ${badgeColor(todo.status)} appearance-none cursor-pointer`}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </CardContent>
    </Card>
  );
}
