'use client';

import { Task, TYPE_LABELS } from '@/lib/types';

interface Props {
  task: Task;
  onOpen: () => void;
}

export default function ProximaCard({ task, onOpen }: Props) {
  return (
    <button onClick={onOpen} className="w-full rounded-2xl border border-slate-800 bg-slate-800/60 p-4 text-left">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Próxima tarefa</span>
      <p className="mt-1 text-lg font-bold text-slate-100">{task.horario}</p>
      <p className="text-xs uppercase tracking-wide text-slate-400">{TYPE_LABELS[task.tipo]}</p>
      {task.brinquedo && <p className="text-sm text-slate-300">{task.brinquedo}</p>}
      <p className="text-sm text-slate-300">{task.cliente}</p>
    </button>
  );
}
