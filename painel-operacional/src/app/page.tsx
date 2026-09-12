'use client';

import { useMemo, useState } from 'react';
import { useTasks } from '@/lib/useTasks';
import { Task, TaskInput } from '@/lib/types';
import { formatDateLabel, todayISO } from '@/lib/format';
import TaskCard from '@/components/TaskCard';
import TaskForm from '@/components/TaskForm';
import BottomNav from '@/components/BottomNav';

type View = 'home' | 'agenda';

export default function Home() {
  const { tasks, loading, addTask, editTask, completeTask, reopenTask, removeTask } = useTasks();
  const [view, setView] = useState<View>('home');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);

  const pending = useMemo(() => tasks.filter((t) => t.status === 'pendente'), [tasks]);
  const nextTask = pending[0];
  const upcoming = pending.slice(1);

  const today = todayISO();
  const doneToday = useMemo(
    () => tasks.filter((t) => t.status === 'concluido' && t.date === today),
    [tasks, today]
  );

  const byDate = useMemo(() => {
    const groups = new Map<string, Task[]>();
    for (const t of tasks) {
      const list = groups.get(t.date) ?? [];
      list.push(t);
      groups.set(t.date, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [tasks]);

  function openNew() {
    setEditingTask(null);
    setShowForm(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setShowForm(true);
  }

  async function handleSave(input: TaskInput) {
    if (editingTask) {
      await editTask(editingTask.id, input);
    } else {
      await addTask(input);
    }
    setShowForm(false);
    setEditingTask(null);
  }

  async function handleDelete() {
    if (editingTask) {
      await removeTask(editingTask.id);
    }
    setShowForm(false);
    setEditingTask(null);
  }

  if (showForm) {
    return (
      <main className="min-h-screen bg-slate-900">
        <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900 p-4">
          <h1 className="text-xl font-bold">{editingTask ? 'Editar tarefa' : 'Nova tarefa'}</h1>
        </header>
        <TaskForm
          initial={editingTask ?? undefined}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingTask(null);
          }}
          onDelete={editingTask ? handleDelete : undefined}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 p-4 backdrop-blur">
        <h1 className="text-xl font-bold">Painel Operacional</h1>
        <p className="text-sm text-slate-400">
          {view === 'home' ? 'O que fazer agora' : 'Agenda completa'}
        </p>
      </header>

      {loading && <p className="p-4 text-slate-400">Carregando...</p>}

      {!loading && view === 'home' && (
        <div className="flex flex-col gap-4 p-4">
          {!nextTask && (
            <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-6 text-center text-slate-300">
              Nenhuma tarefa pendente. Toque em + para adicionar.
            </div>
          )}

          {nextTask && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-500">
                Próxima tarefa
              </h2>
              <TaskCard
                task={nextTask}
                highlighted
                onComplete={() => completeTask(nextTask.id)}
                onEdit={() => openEdit(nextTask)}
              />
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Depois
              </h2>
              <div className="flex flex-col gap-3">
                {upcoming.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onComplete={() => completeTask(t.id)}
                    onEdit={() => openEdit(t)}
                  />
                ))}
              </div>
            </section>
          )}

          {doneToday.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Concluídas hoje ({doneToday.length})
              </h2>
              <div className="flex flex-col gap-3">
                {doneToday.map((t) => (
                  <TaskCard key={t.id} task={t} onReopen={() => reopenTask(t.id)} onEdit={() => openEdit(t)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {!loading && view === 'agenda' && (
        <div className="flex flex-col gap-6 p-4">
          {byDate.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-6 text-center text-slate-300">
              Nenhuma tarefa cadastrada.
            </div>
          )}
          {byDate.map(([date, items]) => (
            <section key={date}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                {formatDateLabel(date)}
              </h2>
              <div className="flex flex-col gap-3">
                {items.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onComplete={t.status === 'pendente' ? () => completeTask(t.id) : undefined}
                    onReopen={t.status === 'concluido' ? () => reopenTask(t.id) : undefined}
                    onEdit={() => openEdit(t)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <BottomNav view={view} onChange={setView} onNew={openNew} />
    </main>
  );
}
