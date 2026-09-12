'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAllTasks, putManyTasks, putTask, getState, setState } from './db';
import { INITIAL_TASKS } from './seedData';
import { Task, TaskStatus, STATUS_ORDER } from './types';
import { todayISO } from './format';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDateState] = useState<string>(todayISO());

  const reload = useCallback(async () => {
    const all = await getAllTasks();
    all.sort((a, b) => a.ordem - b.ordem);
    setTasks(all);
    return all;
  }, []);

  useEffect(() => {
    (async () => {
      const existing = await reload();
      if (existing.length === 0) {
        const seeded: Task[] = INITIAL_TASKS.map((t) => ({
          ...t,
          status: 'PENDENTE' as TaskStatus,
          createdAt: Date.now(),
        }));
        await putManyTasks(seeded);
        await reload();
      }

      const savedDate = await getState<string>('selectedDate');
      if (savedDate) setSelectedDateState(savedDate);

      setLoading(false);
    })();
  }, [reload]);

  const selectDate = useCallback((iso: string) => {
    setSelectedDateState(iso);
    setState('selectedDate', iso);
  }, []);

  const toggleChecklistItem = useCallback(
    async (taskId: string, itemId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const checklist = task.checklist.map((item) =>
        item.id === itemId ? { ...item, marcado: !item.marcado } : item
      );
      const updated = { ...task, checklist };
      await putTask(updated);
      await reload();
    },
    [tasks, reload]
  );

  const saveObservacaoAdicional = useCallback(
    async (taskId: string, texto: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      await putTask({ ...task, observacaoAdicional: texto });
      await reload();
    },
    [tasks, reload]
  );

  const setStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const updated: Task = {
        ...task,
        status,
        completedAt: status === 'CONCLUIDA' ? Date.now() : task.completedAt,
      };
      await putTask(updated);
      await reload();
    },
    [tasks, reload]
  );

  const advanceStatus = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const idx = STATUS_ORDER.indexOf(task.status);
      const next = STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)];
      await setStatus(taskId, next);
    },
    [tasks, setStatus]
  );

  const completeTask = useCallback(
    async (taskId: string) => {
      await setStatus(taskId, 'CONCLUIDA');
    },
    [setStatus]
  );

  const reopenTask = useCallback(
    async (taskId: string) => {
      await setStatus(taskId, 'PENDENTE');
    },
    [setStatus]
  );

  const tasksForDate = tasks.filter((t) => t.data === selectedDate);
  const availableDates = Array.from(new Set(tasks.map((t) => t.data))).sort();

  return {
    tasks,
    tasksForDate,
    availableDates,
    loading,
    selectedDate,
    selectDate,
    toggleChecklistItem,
    saveObservacaoAdicional,
    setStatus,
    advanceStatus,
    completeTask,
    reopenTask,
  };
}
