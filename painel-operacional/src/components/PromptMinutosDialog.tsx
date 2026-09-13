'use client';

import { useState } from 'react';

interface Props {
  titulo: string;
  onCancel: () => void;
  onConfirm: (minutos: string) => void;
}

export default function PromptMinutosDialog({ titulo, onCancel, onConfirm }: Props) {
  const [minutos, setMinutos] = useState('');

  function handleConfirm() {
    const valor = minutos.trim();
    if (!valor) return;
    onConfirm(valor);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-slate-800 p-5 sm:rounded-2xl">
        <p className="mb-3 text-center text-base font-medium text-slate-100">{titulo}</p>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          autoFocus
          value={minutos}
          onChange={(e) => setMinutos(e.target.value)}
          placeholder="Quantos minutos?"
          className="mb-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-lg text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-brand-500"
        />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-slate-700 py-3 text-sm font-semibold text-slate-200"
          >
            CANCELAR
          </button>
          <button
            onClick={handleConfirm}
            disabled={!minutos.trim()}
            className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            ENVIAR
          </button>
        </div>
      </div>
    </div>
  );
}
