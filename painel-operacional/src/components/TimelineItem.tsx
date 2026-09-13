'use client';

import { Task, TYPE_LABELS } from '@/lib/types';
import { isAtrasada } from '@/lib/format';

interface Props {
  task: Task;
  onOpen: () => void;
}

export default function TimelineItem({ task, onOpen }: Props) {
  const atrasada = isAtrasada(task);
  const emAndamento = task.status !== 'PENDENTE' && task.status !== 'CONCLUIDA';
  const concluida = task.status === 'CONCLUIDA';

  const icon = concluida ? '✓' : emAndamento ? '●' : '○';
  const iconColor = concluida ? 'text-emerald-400' : emAndamento ? 'text-brand-500' : 'text-slate-500';

  return (
    <button
      onClick={onOpen}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left ${
        atrasada ? 'bg-red-950/40' : ''
      }`}
    >
      <span className={`mt-0.5 text-lg font-bold ${iconColor}`}>{icon}</span>
      <span className="flex-1">
        <span className="flex flex-wrap items-baseline gap-2">
          <span className={`text-sm font-bold ${concluida ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
            {task.horario}
          </span>
          <span className="text-xs uppercase tracking-wide text-slate-400">{TYPE_LABELS[task.tipo]}</span>
          {atrasada && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Atrasada
            </span>
          )}
        </span>
        <span className={`block text-sm ${concluida ? 'text-slate-500' : 'text-slate-300'}`}>{task.cliente}</span>
        {task.brinquedo && <span className="block text-xs text-slate-500">{task.brinquedo}</span>}
      </span>
    </button>
  );
}
