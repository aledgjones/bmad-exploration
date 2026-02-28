export interface Todo {
  id: number;
  text: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchTodos(): Promise<Todo[]> {
  const res = await fetch('/todos');
  if (!res.ok) {
    throw new Error(`failed to fetch todos: ${res.status}`);
  }
  return res.json();
}

// alias for semantic clarity in upcoming features
export const getTodos = fetchTodos;

export async function createTodo(text: string): Promise<Todo> {
  const res = await fetch('/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`failed to create todo: ${res.status} ${body}`);
  }
  return res.json();
}
