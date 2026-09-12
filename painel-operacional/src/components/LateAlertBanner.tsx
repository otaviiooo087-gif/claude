'use client';

import { Task } from '@/lib/types';
import { whatsappUrl, MENSAGEM_ATRASO } from '@/lib/format';

interface Props {
  tasks: Task[];
  onOpen: (id: string) => void;
}

export default function LateAlertBanner({ tasks, onOpen }: Props) {
  if (tasks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-red-600 bg-red-950/40 p-4">
      <p className="text-sm font-bold uppercase tracking-wide text-red-400">
        {tasks.length === 1 ? '1 tarefa atrasada' : `${tasks.length} tarefas atrasadas`}
      </p>
      {tasks.map((task) => (
        <div key={task.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-900/50 p-3">
          <button onClick={() => onOpen(task.id)} className="flex-1 text-left">
            <p className="text-sm font-semibold text-slate-100">
              {task.horario} · {task.cliente}
            </p>
          </button>
          {task.telefone && (
            <a
              href={whatsappUrl(task.telefone, MENSAGEM_ATRASO)}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold uppercase text-white"
            >
              Avisar cliente
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
