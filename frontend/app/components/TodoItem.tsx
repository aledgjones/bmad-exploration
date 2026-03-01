'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { Todo, TodoStatus } from '../../src/api/todos';

interface TodoItemProps {
  todo: Todo;
  onStatusChange: (id: number, status: TodoStatus) => void;
  onDelete: (id: number) => void;
}

const statusOptions: { value: TodoStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

function badgeColor(status: TodoStatus) {
  switch (status) {
    case 'todo':
      return 'bg-gray-200 text-gray-900';
    case 'in_progress':
      return 'bg-blue-500 text-white';
    case 'done':
      return 'bg-green-600 text-white';
    default:
      // highlight invalid state in red
      return 'bg-red-500 text-white';
  }
}

export default function TodoItem({ todo, onStatusChange, onDelete }: TodoItemProps) {
  return (
    <Card>
      <CardContent className="flex justify-between items-center">
        <span
          className={`${todo.status === 'done' ? 'line-through text-gray-500' : ''}`.trim()}
        >
          {todo.text}
        </span>
        <div className="flex items-center gap-2">
          <select
            aria-label="Change todo status"
            value={todo.status}
            onChange={(e) => onStatusChange(todo.id, e.target.value as TodoStatus)}
            className={`px-4 py-1 text-xs text-center rounded-full ${badgeColor(todo.status)} appearance-none cursor-pointer`}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            aria-label="Delete todo"
            onClick={() => {
              if (window.confirm('Delete this todo?')) {
                onDelete(todo.id);
              }
            }}
            className="px-2 py-1 text-xs text-red-600 hover:text-red-800 cursor-pointer"
          >
            ×
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
