'use client';

import { Task } from '@/lib/types';
import { mapsUrl, telUrl, whatsappUrl } from '@/lib/format';

interface Props {
  task: Task;
  highlighted?: boolean;
  onComplete?: () => void;
  onReopen?: () => void;
  onEdit: () => void;
}

export default function TaskCard({ task, highlighted, onComplete, onReopen, onEdit }: Props) {
  const isDone = task.status === 'concluido';

  return (
    <div
      className={`rounded-2xl p-4 shadow ${
        highlighted
          ? 'border-2 border-brand-500 bg-slate-800'
          : isDone
          ? 'border border-slate-800 bg-slate-900/60 opacity-70'
          : 'border border-slate-800 bg-slate-800/60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
              task.type === 'montagem' ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-900 text-amber-300'
            }`}
          >
            {task.type}
          </span>
          <h3 className="mt-1 text-lg font-semibold text-slate-50">{task.clientName}</h3>
        </div>
        <div className="text-right text-xl font-bold text-brand-500">{task.time}</div>
      </div>

      <p className="mt-1 text-sm text-slate-300">{task.address}</p>
      {task.notes && <p className="mt-1 text-sm italic text-slate-400">{task.notes}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={mapsUrl(task.address)}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded-xl bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white"
        >
          Navegar
        </a>
        {task.phone && (
          <a
            href={telUrl(task.phone)}
            className="rounded-xl bg-slate-700 px-3 py-2 text-center text-sm font-semibold text-slate-100"
          >
            Ligar
          </a>
        )}
        {task.phone && (
          <a
            href={whatsappUrl(task.phone)}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-slate-700 px-3 py-2 text-center text-sm font-semibold text-slate-100"
          >
            WhatsApp
          </a>
        )}
        <button
          onClick={onEdit}
          className="rounded-xl bg-slate-700 px-3 py-2 text-center text-sm font-semibold text-slate-100"
        >
          Editar
        </button>
        {!isDone && onComplete && (
          <button
            onClick={onComplete}
            className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white"
          >
            Concluir
          </button>
        )}
        {isDone && onReopen && (
          <button
            onClick={onReopen}
            className="flex-1 rounded-xl bg-slate-700 px-3 py-2 text-center text-sm font-semibold text-slate-100"
          >
            Reabrir
          </button>
        )}
      </div>
    </div>
  );
}
