'use client';

import { useState } from 'react';
import { Task, TaskInput, TaskType } from '@/lib/types';
import { todayISO } from '@/lib/format';

interface Props {
  initial?: Task;
  onSave: (input: TaskInput) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function TaskForm({ initial, onSave, onCancel, onDelete }: Props) {
  const [clientName, setClientName] = useState(initial?.clientName ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [type, setType] = useState<TaskType>(initial?.type ?? 'montagem');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [time, setTime] = useState(initial?.time ?? '08:00');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !address.trim() || !date || !time) {
      setError('Preencha cliente, endereço, data e hora.');
      return;
    }
    onSave({
      clientName: clientName.trim(),
      address: address.trim(),
      phone: phone.trim() || undefined,
      type,
      date,
      time,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 pb-28">
      <div>
        <label className="mb-1 block text-sm text-slate-300">Cliente *</label>
        <input
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="w-full rounded-xl bg-slate-800 px-4 py-3 text-base outline-none ring-1 ring-slate-700 focus:ring-brand-500"
          placeholder="Nome do cliente"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-300">Endereço *</label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded-xl bg-slate-800 px-4 py-3 text-base outline-none ring-1 ring-slate-700 focus:ring-brand-500"
          placeholder="Rua, número, bairro, cidade"
          rows={2}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-300">Telefone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-xl bg-slate-800 px-4 py-3 text-base outline-none ring-1 ring-slate-700 focus:ring-brand-500"
          placeholder="(00) 00000-0000"
          inputMode="tel"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-300">Tipo *</label>
        <div className="grid grid-cols-2 gap-2">
          {(['montagem', 'retirada'] as TaskType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-xl px-4 py-3 text-base font-medium capitalize ${
                type === t ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm text-slate-300">Data *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-base outline-none ring-1 ring-slate-700 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Hora *</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-base outline-none ring-1 ring-slate-700 focus:ring-brand-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-300">Observações</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-xl bg-slate-800 px-4 py-3 text-base outline-none ring-1 ring-slate-700 focus:ring-brand-500"
          placeholder="Ponto de referência, detalhes do brinquedo, etc."
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 flex gap-3 border-t border-slate-800 bg-slate-900 p-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl bg-slate-800 py-3 text-base font-medium text-slate-200"
        >
          Cancelar
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="flex-1 rounded-xl bg-red-900/60 py-3 text-base font-medium text-red-200"
          >
            Excluir
          </button>
        )}
        <button type="submit" className="flex-1 rounded-xl bg-brand-500 py-3 text-base font-semibold text-white">
          Salvar
        </button>
      </div>
    </form>
  );
}
