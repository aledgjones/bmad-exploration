'use client';

import { useEffect, useState } from 'react';
import NewTodoForm from './components/NewTodoForm';
import TodoList from './components/TodoList';
import Spinner from './components/Spinner';
import type { Todo } from '../src/api/todos';
import { fetchTodos, createTodo, updateTodoStatus, updateTodoText, deleteTodo, type TodoStatus } from '../src/api/todos';

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
    // optimistic update with rollback support
    let previousStatus: TodoStatus | undefined;
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          previousStatus = t.status;
          return { ...t, status };
        }
        return t;
      }),
    );
    try {
      const updated = await updateTodoStatus(id, status);
      // reconcile local state with server response (e.g. completedAt)
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updated } : t)),
      );
    } catch (err: any) {
      console.error('status update failed', err);
      alert('Unable to update status');
      if (previousStatus !== undefined) {
        setTodos((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: previousStatus! } : t)),
        );
      }
    }
  };

  const handleDelete = async (id: number) => {
    let previousTodos: Todo[] = [];
    setTodos((prev) => {
      previousTodos = prev;
      return prev.filter((t) => t.id !== id);
    });
    try {
      await deleteTodo(id);
    } catch (err: any) {
      console.error('delete failed', err);
      setTodos(previousTodos);
      alert('Unable to delete todo');
    }
  };

  const handleEdit = async (id: number, text: string) => {
    let previousText: string | undefined;
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          previousText = t.text;
          return { ...t, text };
        }
        return t;
      }),
    );
    try {
      const updated = await updateTodoText(id, text);
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updated } : t)),
      );
    } catch (err: any) {
      console.error('edit failed', err);
      alert('Unable to update todo');
      if (previousText !== undefined) {
        setTodos((prev) =>
          prev.map((t) => (t.id === id ? { ...t, text: previousText! } : t)),
        );
      }
    }
  };

  return (
    <div
      data-testid="page-root"
      className="flex min-h-screen items-center justify-center bg-gray-100 font-sans dark:bg-black"
    >
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-start py-16 px-8 sm:items-start" aria-busy={loading}>
        <div className="flex flex-col items-center w-full space-y-4 mb-12">
          <h1 className="text-2xl font-bold">Todo List</h1>
          <NewTodoForm onSubmit={handleAdd} />
        </div>
        {loading ? (
          <div className="mt-8 w-full flex justify-center">
            <Spinner label="Loading todos" />
          </div>
        ) : (
          <TodoList todos={todos} onStatusChange={handleStatusChange} onDelete={handleDelete} onEdit={handleEdit} />
        )}
      </main>
    </div>
  );
}
