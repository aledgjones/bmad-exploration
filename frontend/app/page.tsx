'use client';

import { useEffect, useState } from 'react';
import NewTodoForm from './components/NewTodoForm';
import TodoList from './components/TodoList';
import type { Todo } from '../src/api/todos';
import { fetchTodos, createTodo, updateTodoStatus, TodoStatus } from '../src/api/todos';

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
      // rethrow so caller (NewTodoForm) knows the submission failed and can
      // avoid clearing the input
      throw err;
    }
  };

  const handleStatusChange = async (id: number, status: TodoStatus) => {
    console.log('handleStatusChange called', id, status);
    // optimistic update
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      console.log('calling updateTodoStatus...');
      const res = await updateTodoStatus(id, status);
      console.log('updateTodoStatus result', res);
    } catch (err: any) {
      console.error('status update failed', err);
      alert('Unable to update status');
      // rollback by refetching or resetting to original state
      fetchTodos()
        .then((list) => setTodos(list))
        .catch(() => { });
    }
  };

  return (
    <div
      data-testid="page-root"
      className="flex min-h-screen items-center justify-center bg-gray-100 font-sans dark:bg-black"
    >
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-start py-16 px-8 sm:items-start">
        <div className="flex flex-col items-center w-full space-y-4 mb-12">
          <h1 className="text-2xl font-bold">Todo List</h1>
          <NewTodoForm onSubmit={handleAdd} />
        </div>
        {loading ? (
          <p className="mt-4">Loading...</p>
        ) : (
          <TodoList todos={todos} onStatusChange={handleStatusChange} />
        )}
      </main>
    </div>
  );
}
