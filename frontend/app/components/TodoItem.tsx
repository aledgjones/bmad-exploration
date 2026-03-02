'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { Todo, TodoStatus } from '../../src/api/todos';

interface TodoItemProps {
  todo: Todo;
  onStatusChange: (id: number, status: TodoStatus) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number, text: string) => void;
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

export default function TodoItem({ todo, onStatusChange, onDelete, onEdit }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const inputRef = useRef<HTMLInputElement>(null);

  // sync editText when todo.text changes (e.g. optimistic rollback)
  useEffect(() => {
    setEditText(todo.text);
  }, [todo.text]);

  // auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editText.trim();
    if (!trimmed) {
      // reject empty — stay in edit mode
      return;
    }
    if (trimmed === todo.text) {
      // no change — just exit edit mode
      setIsEditing(false);
      return;
    }
    onEdit(todo.id, trimmed);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(todo.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <Card className={todo.status === 'done' ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <CardContent className="flex justify-between items-center">
        {isEditing ? (
          <div className="flex items-center gap-1 flex-1 mr-2">
            <input
              ref={inputRef}
              aria-label="Edit todo text"
              className="flex-1 border rounded px-2 py-1 text-sm"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              aria-label="Save edit"
              onClick={handleSave}
              className="px-2 py-1 text-xs text-green-600 hover:text-green-800 cursor-pointer"
            >
              ✓
            </button>
            <button
              aria-label="Cancel edit"
              onClick={handleCancel}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 cursor-pointer"
            >
              ✗
            </button>
          </div>
        ) : (
          <span
            className={`${todo.status === 'done' ? 'line-through text-gray-500' : ''}`.trim()}
          >
            {todo.text}
          </span>
        )}
        {!isEditing && (
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
              aria-label="Edit todo"
              onClick={() => setIsEditing(true)}
              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              ✎
            </button>
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
        )}
      </CardContent>
    </Card>
  );
}
