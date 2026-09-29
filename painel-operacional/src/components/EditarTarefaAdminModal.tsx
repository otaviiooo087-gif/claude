'use client';

import { useState } from 'react';
import { Task, TaskType, TYPE_LABELS } from '@/lib/types';
import { UserProfile } from '@/lib/authTypes';
import {
  atualizarTarefaAtribuida,
  excluirTarefaAtribuida,
  reatribuirTarefa,
} from '@/lib/tarefasAtribuidas';

const TIPOS: TaskType[] = ['MONTAGEM', 'RETIRADA', 'EVENTO', 'LOGISTICA'];

interface Props {
  uid: string;
  task: Task;
  operadores: UserProfile[];
  onFechar: () => void;
}

export default function EditarTarefaAdminModal({ uid, task, operadores, onFechar }: Props) {
  const [form, setForm] = useState<Task>(task);
  const [operadorUid, setOperadorUid] = useState(uid);
  const [ajudanteUid, setAjudanteUid] = useState(task.ajudanteUid ?? '');
  const [salvando, setSalvando] = useState(false);
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      const ajudante = operadores.find((o) => o.uid === ajudanteUid);
      const atualizada: Task = {
        ...form,
        ajudanteUid: ajudanteUid || undefined,
        ajudanteNome: ajudante?.nome,
      };
      if (operadorUid !== uid) {
        await reatribuirTarefa(uid, operadorUid, atualizada);
      } else {
        await atualizarTarefaAtribuida(uid, atualizada);
      }
      onFechar();
    } finally {
      setSalvando(false);
    }
  }

  async function alternarCancelamento() {
    setSalvando(true);
    try {
      const atualizada = { ...form, cancelada: !form.cancelada };
      await atualizarTarefaAtribuida(uid, atualizada);
      setForm(atualizada);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    setSalvando(true);
    try {
      await excluirTarefaAtribuida(uid, task.id);
      onFechar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[4000] flex items-end bg-black/60" onClick={onFechar}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-slate-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-50">Editar tarefa</h2>
          <button onClick={onFechar} className="p-1 text-xl text-slate-400">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {form.cancelada && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400">
              Esta tarefa está marcada como cancelada.
            </p>
          )}

          <Campo label="Cliente">
            <input
              value={form.cliente}
              onChange={(e) => setForm({ ...form, cliente: e.target.value })}
              className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
            />
          </Campo>

          <div className="grid grid-cols-2 gap-2">
            <Campo label="Data">
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
              />
            </Campo>
            <Campo label="Horário (HH:MM)">
              <input
                value={form.horarioComparacao}
                onChange={(e) => setForm({ ...form, horarioComparacao: e.target.value, horario: e.target.value })}
                placeholder="09:30"
                className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
              />
            </Campo>
          </div>

          <Campo label="Tipo">
            <div className="flex flex-wrap gap-1">
              {TIPOS.map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, tipo: t })}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    form.tipo === t ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </Campo>

          <Campo label="Endereço">
            <input
              value={form.endereco ?? ''}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
            />
          </Campo>

          <Campo label="Brinquedo">
            <input
              value={form.brinquedo ?? ''}
              onChange={(e) => setForm({ ...form, brinquedo: e.target.value })}
              className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
            />
          </Campo>

          <Campo label="Observações">
            <textarea
              value={form.observacoes ?? ''}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              rows={2}
              className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
            />
          </Campo>

          <Campo label="Atribuída a">
            <select
              value={operadorUid}
              onChange={(e) => setOperadorUid(e.target.value)}
              className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
            >
              {operadores.map((op) => (
                <option key={op.uid} value={op.uid}>
                  {op.nome}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Ajudante (opcional)">
            <select
              value={ajudanteUid}
              onChange={(e) => setAjudanteUid(e.target.value)}
              className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
            >
              <option value="">Nenhum</option>
              {operadores.map((op) => (
                <option key={op.uid} value={op.uid}>
                  {op.nome}
                </option>
              ))}
            </select>
          </Campo>

          <button
            onClick={salvar}
            disabled={salvando}
            className="rounded-xl bg-brand-500 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>

          <button
            onClick={alternarCancelamento}
            disabled={salvando}
            className="rounded-xl bg-slate-800 py-3 text-sm font-bold text-amber-400 disabled:opacity-50"
          >
            {form.cancelada ? 'Reativar tarefa' : 'Cancelar montagem'}
          </button>

          {!confirmandoExcluir ? (
            <button
              onClick={() => setConfirmandoExcluir(true)}
              className="rounded-xl bg-slate-800 py-3 text-sm font-bold text-red-400"
            >
              Excluir tarefa
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmandoExcluir(false)}
                className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-bold text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={excluir}
                disabled={salvando}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                Confirmar exclusão
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase text-slate-500">{label}</span>
      {children}
    </label>
  );
}
