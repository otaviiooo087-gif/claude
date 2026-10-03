'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTasks } from '@/lib/useTasks';
import { useLateAlert } from '@/lib/useLateAlert';
import { formatDateFull, todayISO } from '@/lib/format';
import { getState, setState } from '@/lib/db';
import DateSelector from '@/components/DateSelector';
import AgoraCard from '@/components/AgoraCard';
import ProximaCard from '@/components/ProximaCard';
import TimelineItem from '@/components/TimelineItem';
import TaskDetail from '@/components/TaskDetail';
import BaseIndicator from '@/components/BaseIndicator';
import LateAlertBanner from '@/components/LateAlertBanner';
import ImportarAgenda from '@/components/ImportarAgenda';
import NovaTarefaModal from '@/components/NovaTarefaModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import MenuLateral from '@/components/MenuLateral';
import AlternarModo from '@/components/AlternarModo';
import { useAuth } from '@/lib/useAuth';
import { useLiveLocation } from '@/lib/useLiveLocation';
import { useSyncTarefaAtual } from '@/lib/useSyncTarefaAtual';
import { useSincronizarAtribuidas } from '@/lib/useSincronizarAtribuidas';
import { useSyncProdutividade } from '@/lib/useSyncProdutividade';
import BotaoEmergencia from '@/components/BotaoEmergencia';

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
    confirmarPagamento,
    setStatus,
    advanceStatus,
    completeTask,
    reopenTask,
    arquivarTask,
    excluirTasks,
    arquivadas,
    importTasks,
  } = useTasks();

  const lateTasks = useLateAlert(useMemo(() => tasks.filter((t) => !t.arquivada), [tasks]));
  const [verArquivadas, setVerArquivadas] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState(false);
  const [apagando, setApagando] = useState<{ msg: string; ids: string[] } | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);

  const { configured, user, profile } = useAuth();
  const rastreamentoAtivo = configured && Boolean(user);
  useLiveLocation(user?.uid ?? null, profile?.nome ?? '', rastreamentoAtivo);
  useSincronizarAtribuidas(user?.uid ?? null, rastreamentoAtivo, loading, tasks, importTasks);
  useSyncProdutividade(user?.uid ?? null, profile?.nome ?? '', rastreamentoAtivo, tasks);

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

  // Dia sem tarefas (ex: o app abriu em um dia vazio): pula sozinho para hoje, o próximo dia com
  // tarefas ou o último — só uma vez por carregamento, para não brigar com a escolha manual.
  const [pulou, setPulou] = useState(false);
  useEffect(() => {
    if (loading || pulou || availableDates.length === 0) return;
    setPulou(true);
    if (availableDates.includes(selectedDate)) return;
    const hoje = todayISO();
    selectDate(availableDates.find((d) => d >= hoje) ?? availableDates[availableDates.length - 1]);
  }, [loading, pulou, availableDates, selectedDate, selectDate]);

  useSyncTarefaAtual(user?.uid ?? null, rastreamentoAtivo, agora);

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
        onConfirmarPagamento={() => confirmarPagamento(openTask_.id)}
        onSetStatus={(status) => setStatus(openTask_.id, status)}
        onComplete={() => completeTask(openTask_.id)}
        onReopen={() => reopenTask(openTask_.id)}
        onArquivar={() => {
          arquivarTask(openTask_.id);
          closeTask();
        }}
      />
    );
  }

  if (importando) {
    return (
      <ImportarAgenda
        tasksExistentes={tasks}
        onImportar={importTasks}
        onFechar={() => setImportando(false)}
      />
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl bg-slate-900 pb-10">
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-slate-800 bg-slate-900/95 p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {configured && user && <MenuLateral />}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-slate-50">Zimba Festas App</h1>
              <p className="truncate text-sm text-slate-400">{formatDateFull(selectedDate)}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {configured && user && <AlternarModo />}
            <button
              onClick={() => setImportando(true)}
              className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200"
            >
              + Importar
            </button>
          </div>
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
            {tasksForDate.length === 0 ? (
              <>
                <p>Nenhuma tarefa neste dia.</p>
                {availableDates.length > 0 && (
                  <p className="mt-2 text-xs text-slate-400">Escolha outro dia nos botões de data acima.</p>
                )}
              </>
            ) : (
              'Todas as tarefas do dia foram concluídas.'
            )}
          </div>
        )}

        {agora && (
          <AgoraCard task={agora} onOpen={() => openTask(agora.id)} onIniciar={() => advanceStatus(agora.id)} />
        )}

        {proxima && <ProximaCard task={proxima} onOpen={() => openTask(proxima.id)} />}

        {tasksForDate.length > 0 && (
        <section>
          <div className="flex flex-col divide-y divide-slate-800/60 rounded-2xl bg-slate-800/30">
            {tasksForDate.map((task) => (
              <TimelineItem key={task.id} task={task} onOpen={() => openTask(task.id)} />
            ))}
          </div>
        </section>
        )}

        {concluidasCount > 0 && (
          <button
            onClick={() => tasksForDate.filter((t) => t.status === 'CONCLUIDA').forEach((t) => arquivarTask(t.id))}
            className="rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-slate-300"
          >
            📦 Arquivar as {concluidasCount} concluída{concluidasCount !== 1 ? 's' : ''} do dia
          </button>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={() => setNovaTarefa(true)}
            className="rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-200"
          >
            ➕ Adicionar tarefa neste dia
          </button>
          {tasks.some((t) => t.id.startsWith('seed-')) && (
            <button
              onClick={() =>
                setApagando({
                  msg: 'Excluir as tarefas de exemplo antigas deste aparelho?',
                  ids: tasks.filter((t) => t.id.startsWith('seed-')).map((t) => t.id),
                })
              }
              className="rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-red-400"
            >
              🗑️ Excluir tarefas de exemplo antigas
            </button>
          )}
          {tasksForDate.length > 0 && (
            <button
              onClick={() =>
                setApagando({
                  msg: `Excluir as ${tasksForDate.length} tarefa(s) deste dia da sua agenda? Elas somem só daqui; o admin continua vendo.`,
                  ids: tasksForDate.map((t) => t.id),
                })
              }
              className="rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-red-400"
            >
              🗑️ Excluir todas as tarefas deste dia
            </button>
          )}
        </div>

        {arquivadas.length > 0 && (
          <section>
            <button
              onClick={() => setVerArquivadas((v) => !v)}
              className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500"
            >
              📦 Arquivadas ({arquivadas.length}) {verArquivadas ? '▲' : '▼'}
            </button>
            {verArquivadas && (
              <div className="flex flex-col divide-y divide-slate-800/60 rounded-2xl bg-slate-800/20">
                {arquivadas.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-300">{t.cliente}</p>
                      <p className="text-xs text-slate-500">
                        {t.data.split('-').reverse().join('/')} · {t.horario}
                      </p>
                    </div>
                    <button onClick={() => arquivarTask(t.id, false)} className="shrink-0 text-xs font-bold text-brand-500">
                      Restaurar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <BaseIndicator />
      </div>

      {novaTarefa && (
        <NovaTarefaModal
          dataInicial={selectedDate}
          onFechar={() => setNovaTarefa(false)}
          onSalvar={async (t) => {
            await importTasks([{ ...t, ordem: tasks.length + 1 }]);
            setNovaTarefa(false);
          }}
        />
      )}

      {apagando && (
        <ConfirmDialog
          message={apagando.msg}
          confirmLabel="EXCLUIR"
          onCancel={() => setApagando(null)}
          onConfirm={async () => {
            const ids = apagando.ids;
            setApagando(null);
            await excluirTasks(ids);
          }}
        />
      )}

      {configured && user && <BotaoEmergencia />}
    </main>
  );
}
