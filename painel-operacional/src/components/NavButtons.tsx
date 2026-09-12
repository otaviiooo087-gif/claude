'use client';

import { Task } from '@/lib/types';
import { wazeUrl, googleMapsUrl, telUrl } from '@/lib/format';

interface Props {
  task: Task;
  showCall?: boolean;
}

export default function NavButtons({ task, showCall = true }: Props) {
  const waze = wazeUrl(task);
  const maps = googleMapsUrl(task);

  return (
    <div className="flex flex-col gap-2">
      {task.endereco && <p className="text-sm text-slate-300">{task.endereco}</p>}

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

      {maps && (
        <a
          href={maps}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-slate-700 px-4 py-3 text-center text-sm font-semibold text-slate-100"
        >
          ABRIR GOOGLE MAPS
        </a>
      )}

      {showCall && task.telefone && (
        <a
          href={telUrl(task.telefone)}
          className="rounded-xl bg-slate-700 px-4 py-3 text-center text-sm font-semibold text-slate-100"
        >
          LIGAR · {task.telefone}
        </a>
      )}
    </div>
  );
}
