'use client';

import { useEffect, useState } from 'react';
import NewTodoForm from './components/NewTodoForm';
import TodoList from './components/TodoList';
import type { Todo } from '../src/api/todos';
import { fetchTodos, createTodo } from '../src/api/todos';

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodos()
      .then((list) => setTodos(list))
      .catch((err) => {
        console.error('failed to load todos', err);
        alert('Unable to load todos. Is the backend running?');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (text: string) => {
    try {
      const newItem = await createTodo(text);
      setTodos((prev) => [newItem, ...prev]);
    } catch (err: any) {
      console.error('error creating todo', err);
      alert('Unable to add todo. Is the backend running?');
    }
  };

  return (
    <div
      data-testid="page-root"
      className="flex min-h-screen items-center justify-center bg-gray-100 font-sans dark:bg-black"
    >
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-start py-16 px-8 sm:items-start">
        <h1 className="text-2xl font-bold mb-4">Todo List</h1>
        <NewTodoForm onSubmit={handleAdd} />
        {loading ? (
          <p className="mt-4">Loading...</p>
        ) : (
          <TodoList todos={todos} />
        )}
      </main>
    </div>
  );
}
