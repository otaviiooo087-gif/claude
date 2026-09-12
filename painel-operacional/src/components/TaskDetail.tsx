'use client';

import { useState } from 'react';
import { Task, TYPE_LABELS, STATUS_LABELS, STATUS_ORDER } from '@/lib/types';
import { formatCurrency, isAtrasada } from '@/lib/format';
import NavButtons from './NavButtons';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  task: Task;
  onBack: () => void;
  onToggleChecklistItem: (itemId: string) => void;
  onSaveObservacao: (texto: string) => void;
  onSetStatus: (status: Task['status']) => void;
  onComplete: () => void;
  onReopen: () => void;
}

export default function TaskDetail({
  task,
  onBack,
  onToggleChecklistItem,
  onSaveObservacao,
  onSetStatus,
  onComplete,
  onReopen,
}: Props) {
  const [observacao, setObservacao] = useState(task.observacaoAdicional ?? '');
  const [confirmando, setConfirmando] = useState(false);
  const [statusAberto, setStatusAberto] = useState(false);
  const atrasada = isAtrasada(task);
  const concluida = task.status === 'CONCLUIDA';

  return (
    <div className="min-h-screen bg-slate-900 pb-8">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-800 bg-slate-900/95 p-4 backdrop-blur">
        <button onClick={onBack} className="text-lg font-bold text-brand-500">
          ← Voltar
        </button>
      </header>

      <div className="flex flex-col gap-5 p-4">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-slate-300">
              {TYPE_LABELS[task.tipo]}
            </span>
            <span className="text-xs font-semibold uppercase text-slate-400">{STATUS_LABELS[task.status]}</span>
            {atrasada && (
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                Atrasada
              </span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-50">{task.horario}</h1>
          <p className="mt-1 text-lg font-bold text-slate-100">{task.cliente}</p>
          {task.brinquedo && <p className="text-sm text-slate-300">{task.brinquedo}</p>}
        </div>

        {task.valor !== undefined && (
          <div className="rounded-xl bg-slate-800/60 px-4 py-3">
            <span className="text-xs uppercase text-slate-400">Valor</span>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(task.valor)}</p>
          </div>
        )}

        <NavButtons task={task} />

        {task.observacoes && (
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Observações</span>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{task.observacoes}</p>
          </div>
        )}

        {task.checklist.length > 0 && (
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Checklist</span>
            <div className="mt-2 flex flex-col gap-2">
              {task.checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-4 py-3 text-sm text-slate-100"
                >
                  <input
                    type="checkbox"
                    checked={item.marcado}
                    onChange={() => onToggleChecklistItem(item.id)}
                    className="h-5 w-5 shrink-0 accent-brand-500"
                  />
                  <span className={item.marcado ? 'text-slate-500 line-through' : ''}>{item.texto}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Observação adicional</span>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Anotar algo durante a operação..."
            rows={3}
            className="mt-2 w-full rounded-xl bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-brand-500"
          />
          <button
            onClick={() => onSaveObservacao(observacao)}
            className="mt-2 w-full rounded-xl bg-slate-700 py-2 text-sm font-semibold text-slate-100"
          >
            SALVAR
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => setStatusAberto((v) => !v)}
            className="rounded-xl bg-slate-700 py-3 text-sm font-semibold text-slate-100"
          >
            ALTERAR STATUS · {STATUS_LABELS[task.status]}
          </button>
          {statusAberto && (
            <div className="flex flex-col gap-1 rounded-xl bg-slate-800 p-2">
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onSetStatus(s);
                    setStatusAberto(false);
                  }}
                  className={`rounded-lg px-3 py-2 text-left text-sm ${
                    s === task.status ? 'bg-brand-500 text-white' : 'text-slate-200'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}

          {concluida ? (
            <button onClick={onReopen} className="rounded-xl bg-slate-700 py-3 text-sm font-semibold text-slate-100">
              REABRIR TAREFA
            </button>
          ) : (
            <button
              onClick={() => setConfirmando(true)}
              className="rounded-xl bg-emerald-600 py-3 text-base font-bold text-white"
            >
              CONCLUIR TAREFA
            </button>
          )}
        </div>
      </div>

      {confirmando && (
        <ConfirmDialog
          message="Concluir esta tarefa?"
          onCancel={() => setConfirmando(false)}
          onConfirm={() => {
            onComplete();
            setConfirmando(false);
          }}
        />
      )}
    </div>
  );
}
