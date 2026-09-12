'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTasks } from '@/lib/useTasks';
import { useLateAlert } from '@/lib/useLateAlert';
import { formatDateFull } from '@/lib/format';
import { getState, setState } from '@/lib/db';
import DateSelector from '@/components/DateSelector';
import AgoraCard from '@/components/AgoraCard';
import ProximaCard from '@/components/ProximaCard';
import TimelineItem from '@/components/TimelineItem';
import TaskDetail from '@/components/TaskDetail';
import BaseIndicator from '@/components/BaseIndicator';
import LateAlertBanner from '@/components/LateAlertBanner';

export default function Home() {
  const {
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
  } = useTasks();

  const lateTasks = useLateAlert(tasks);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    getState<string>('lastOpenedTaskId').then((id) => {
      if (id) setOpenTaskId(id);
    });
  }, [loading]);

  function openTask(id: string) {
    setOpenTaskId(id);
    setState('lastOpenedTaskId', id);
  }

  function closeTask() {
    setOpenTaskId(null);
    setState('lastOpenedTaskId', null);
  }

  const pendentes = useMemo(() => tasksForDate.filter((t) => t.status !== 'CONCLUIDA'), [tasksForDate]);
  const agora = pendentes[0];
  const proxima = pendentes[1];
  const concluidasCount = tasksForDate.filter((t) => t.status === 'CONCLUIDA').length;
  const emAndamentoCount = tasksForDate.filter(
    (t) => t.status !== 'PENDENTE' && t.status !== 'CONCLUIDA'
  ).length;
  const pendentesCount = tasksForDate.filter((t) => t.status === 'PENDENTE').length;

  const openTask_ = openTaskId ? tasks.find((t) => t.id === openTaskId) : undefined;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900">
        <p className="text-slate-400">Carregando...</p>
      </main>
    );
  }

  if (openTask_) {
    return (
      <TaskDetail
        task={openTask_}
        onBack={closeTask}
        onToggleChecklistItem={(itemId) => toggleChecklistItem(openTask_.id, itemId)}
        onSaveObservacao={(texto) => saveObservacaoAdicional(openTask_.id, texto)}
        onSetStatus={(status) => setStatus(openTask_.id, status)}
        onComplete={() => completeTask(openTask_.id)}
        onReopen={() => reopenTask(openTask_.id)}
      />
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl bg-slate-900 pb-10">
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-slate-800 bg-slate-900/95 p-4 backdrop-blur">
        <div>
          <h1 className="text-lg font-bold text-slate-50">Zimba Festa</h1>
          <p className="text-sm text-slate-400">{formatDateFull(selectedDate)}</p>
        </div>
        <DateSelector dates={availableDates} selected={selectedDate} onSelect={selectDate} />
        <div className="flex gap-4 text-xs text-slate-400">
          <span>{tasksForDate.length} tarefas</span>
          <span className="text-emerald-400">{concluidasCount} concluídas</span>
          <span className="text-brand-500">{emAndamentoCount} em andamento</span>
          <span>{pendentesCount} pendentes</span>
        </div>
      </header>

      <div className="flex flex-col gap-4 p-4">
        <LateAlertBanner tasks={lateTasks} onOpen={openTask} />

        {!agora && (
          <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-6 text-center text-slate-300">
            Todas as tarefas do dia foram concluídas.
          </div>
        )}

        {agora && (
          <AgoraCard task={agora} onOpen={() => openTask(agora.id)} onIniciar={() => advanceStatus(agora.id)} />
        )}

        {proxima && <ProximaCard task={proxima} onOpen={() => openTask(proxima.id)} />}

        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Linha do tempo</h2>
          <div className="flex flex-col divide-y divide-slate-800/60 rounded-2xl bg-slate-800/30">
            {tasksForDate.map((task) => (
              <TimelineItem key={task.id} task={task} onOpen={() => openTask(task.id)} />
            ))}
          </div>
        </section>

        <BaseIndicator />
      </div>
    </main>
  );
}
