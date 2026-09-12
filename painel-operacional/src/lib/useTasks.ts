'use client';

import { useCallback, useEffect, useState } from 'react';
import { deleteTask, getAllTasks, putTask } from './db';
import { Task, TaskInput } from './types';

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const all = await getAllTasks();
    all.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    setTasks(all);
  }, []);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  const addTask = useCallback(
    async (input: TaskInput) => {
      const task: Task = {
        ...input,
        id: makeId(),
        status: 'pendente',
        createdAt: Date.now(),
      };
      await putTask(task);
      await reload();
      return task;
    },
    [reload]
  );

  const editTask = useCallback(
    async (id: string, input: TaskInput) => {
      const existing = tasks.find((t) => t.id === id);
      if (!existing) return;
      await putTask({ ...existing, ...input });
      await reload();
    },
    [tasks, reload]
  );

  const completeTask = useCallback(
    async (id: string) => {
      const existing = tasks.find((t) => t.id === id);
      if (!existing) return;
      await putTask({ ...existing, status: 'concluido', completedAt: Date.now() });
      await reload();
    },
    [tasks, reload]
  );

  const reopenTask = useCallback(
    async (id: string) => {
      const existing = tasks.find((t) => t.id === id);
      if (!existing) return;
      const { completedAt, ...rest } = existing;
      await putTask({ ...rest, status: 'pendente' });
      await reload();
    },
    [tasks, reload]
  );

  const removeTask = useCallback(
    async (id: string) => {
      await deleteTask(id);
      await reload();
    },
    [reload]
  );

  return { tasks, loading, addTask, editTask, completeTask, reopenTask, removeTask };
}
