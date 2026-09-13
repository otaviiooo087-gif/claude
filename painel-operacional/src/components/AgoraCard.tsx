'use client';

import { Task, TYPE_LABELS } from '@/lib/types';
import { wazeUrl, whatsappUrl, isAtrasada } from '@/lib/format';

interface Props {
  task: Task;
  onOpen: () => void;
  onIniciar: () => void;
}

export default function AgoraCard({ task, onOpen, onIniciar }: Props) {
  const waze = wazeUrl(task);
  const atrasada = isAtrasada(task);
  const jaIniciada = task.status !== 'PENDENTE';

  return (
    <section
      className={`rounded-2xl border-2 p-4 ${atrasada ? 'border-red-600 bg-red-950/30' : 'border-brand-500 bg-slate-800'}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-brand-500">Agora</span>
        {atrasada && (
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            Atrasada
          </span>
        )}
      </div>

      <button onClick={onOpen} className="block w-full text-left">
        <p className="text-2xl font-extrabold text-slate-50">{task.horario}</p>
        <p className="mt-1 text-lg font-bold uppercase text-slate-100">{task.cliente}</p>
        <p className="text-xs uppercase tracking-wide text-slate-400">{TYPE_LABELS[task.tipo]}</p>
        {task.brinquedo && <p className="text-sm text-slate-300">{task.brinquedo}</p>}
        {task.endereco && <p className="mt-2 text-sm text-slate-300">{task.endereco}</p>}
      </button>

      <div className="mt-4 flex flex-col gap-2">
        {waze && (
          <a
            href={waze}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-brand-500 px-4 py-3 text-center text-base font-bold text-white"
          >
            NAVEGAR COM WAZE
          </a>
        )}
        <div className="flex gap-2">
          {task.telefone && (
            <a
              href={whatsappUrl(task.telefone)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white"
            >
              WHATSAPP
            </a>
          )}
          {!jaIniciada && (
            <button
              onClick={onIniciar}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white"
            >
              INICIAR
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
