'use client';

import { useState } from 'react';
import { Task, TaskType, TYPE_LABELS } from '@/lib/types';

const TIPOS: TaskType[] = ['LOGISTICA', 'MONTAGEM', 'RETIRADA', 'EVENTO'];

/** Cria uma tarefa avulsa à mão (ex: "Levar o Marcelo embora") direto na agenda. */
export default function NovaTarefaModal({
  dataInicial,
  onSalvar,
  onFechar,
}: {
  dataInicial: string;
  onSalvar: (t: Task) => Promise<void>;
  onFechar: () => void;
}) {
  const [data, setData] = useState(dataInicial);
  const [hora, setHora] = useState('');
  const [tipo, setTipo] = useState<TaskType>('LOGISTICA');
  const [titulo, setTitulo] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);
  const campo = 'w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700';

  async function salvar() {
    setSalvando(true);
    try {
      await onSalvar({
        id: `manual-${Date.now()}`,
        data,
        horario: hora || 'A combinar',
        horarioComparacao: hora || '23:59',
        tipo,
        cliente: titulo.trim(),
        endereco: endereco.trim() || undefined,
        telefone: telefone.trim() || undefined,
        observacoes: obs.trim() || undefined,
        checklist: [],
        status: 'PENDENTE',
        ordem: 0,
        createdAt: Date.now(),
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onFechar}>
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-base font-bold text-slate-50">Nova tarefa</h3>
        <div className="flex flex-col gap-2">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="O que é? (ex: Levar o Marcelo embora)" className={campo} />
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TaskType)} className={campo}>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={campo} />
          </div>
          <input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Endereço (opcional)" className={campo} />
          <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Telefone (opcional)" className={campo} />
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="Observações (opcional)" className={campo} />
          <button
            onClick={salvar}
            disabled={salvando || !titulo.trim() || !data}
            className="rounded-xl bg-brand-500 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Salvar tarefa
          </button>
        </div>
      </div>
    </div>
  );
}
