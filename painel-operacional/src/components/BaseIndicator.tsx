'use client';

import { useState } from 'react';
import { BASE_LOCATION } from '@/lib/types';

export default function BaseIndicator() {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="rounded-xl bg-slate-800/40 px-3 py-2">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
      >
        <span>Base da operação</span>
        <span>{aberto ? '−' : '+'}</span>
      </button>
      {aberto && (
        <div className="mt-2 text-sm text-slate-300">
          <p className="font-semibold text-slate-200">{BASE_LOCATION.nome}</p>
          <p>{BASE_LOCATION.linha1}</p>
          <p>{BASE_LOCATION.endereco}</p>
          <p>{BASE_LOCATION.complemento}</p>
        </div>
      )}
    </div>
  );
}
