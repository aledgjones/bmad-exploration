'use client';

import type { Todo, TodoStatus } from '../../src/api/todos';
import TodoItem from './TodoItem';

interface TodoListProps {
  todos: Todo[];
  onStatusChange: (id: number, status: TodoStatus) => void;
}

const statusOrder: TodoStatus[] = ['todo', 'in_progress', 'done'];

export default function TodoList({ todos, onStatusChange }: TodoListProps) {
  if (todos.length === 0) {
    return <p className="mt-4">No todos yet.</p>;
  }

  // group by status
  const groups: Record<TodoStatus, Todo[]> = {
    todo: [],
    'in_progress': [],
    done: [],
  };
  todos.forEach((t) => {
    if (groups[t.status]) groups[t.status].push(t);
    else groups[t.status] = [t];
  });

  const emojiFor = (status: TodoStatus) => {
    switch (status) {
      case 'todo':
        return '📝';
      case 'in_progress':
        return '⏳';
      case 'done':
        return '✅';
      default:
        return '';
    }
  };

  return (
    <div className="mt-8 w-full space-y-8">
      {statusOrder.map((status) => (
        <section key={status} className="">
          <h3 className="text-lg font-semibold capitalize">
            {emojiFor(status)} {status.replace(/[-_]/g, ' ')}
          </h3>
          <ul role="list" className="mt-2 space-y-2">
            {groups[status].map((t) => (
              <li key={t.id} role="listitem">
                <TodoItem todo={t} onStatusChange={onStatusChange} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
