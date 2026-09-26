'use client';

import { useState } from 'react';
import { parseLogistica, draftsParaTasks, TaskDraft } from '@/lib/importLogistica';
import { Task, TaskType, TYPE_LABELS } from '@/lib/types';

interface Props {
  tasksExistentes: Task[];
  onImportar: (novas: Task[]) => Promise<void>;
  onFechar: () => void;
}

const TIPOS: TaskType[] = ['MONTAGEM', 'RETIRADA', 'EVENTO', 'LOGISTICA'];

export default function ImportarAgenda({ tasksExistentes, onImportar, onFechar }: Props) {
  const [texto, setTexto] = useState('');
  const [drafts, setDrafts] = useState<TaskDraft[] | null>(null);
  const [salvando, setSalvando] = useState(false);

  function analisar() {
    const resultado = parseLogistica(texto);
    setDrafts(resultado);
  }

  function atualizarDraft(idx: number, campo: keyof TaskDraft, valor: string) {
    if (!drafts) return;
    const copia = [...drafts];
    copia[idx] = { ...copia[idx], [campo]: valor };
    if (campo === 'horarioComparacao' || campo === 'cliente') {
      copia[idx].precisaRevisao = !copia[idx].horarioComparacao || !copia[idx].cliente;
    }
    setDrafts(copia);
  }

  function removerDraft(idx: number) {
    if (!drafts) return;
    setDrafts(drafts.filter((_, i) => i !== idx));
  }

  function adicionarLinhaEmBranco() {
    const base: TaskDraft = {
      data: drafts?.[0]?.data || new Date().toISOString().slice(0, 10),
      horario: '',
      horarioComparacao: '',
      tipo: 'MONTAGEM',
      cliente: '',
      precisaRevisao: true,
    };
    setDrafts([...(drafts || []), base]);
  }

  async function salvar() {
    if (!drafts || drafts.length === 0) return;
    setSalvando(true);
    try {
      const tasks = draftsParaTasks(drafts, tasksExistentes);
      await onImportar(tasks);
      onFechar();
    } finally {
      setSalvando(false);
    }
  }

  const pendencias = drafts?.filter((d) => d.precisaRevisao).length ?? 0;

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-800 bg-slate-900/95 p-4 backdrop-blur">
        <button onClick={onFechar} className="text-lg font-bold text-brand-500">
          ← Voltar
        </button>
        <h1 className="text-base font-bold text-slate-50">Importar agenda</h1>
      </header>

      <div className="flex flex-col gap-4 p-4">
        {!drafts && (
          <>
            <p className="text-sm text-slate-400">
              Cole abaixo o texto da logística que o Matheus mandou. Depois de analisar, você revisa cada
              tarefa antes de salvar — nada entra na agenda sem você confirmar.
            </p>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={14}
              placeholder="Cole aqui o texto da logística..."
              className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-brand-500"
            />
            <button
              onClick={analisar}
              disabled={!texto.trim()}
              className="rounded-xl bg-brand-500 py-3 text-base font-bold text-white disabled:opacity-50"
            >
              ANALISAR TEXTO
            </button>
          </>
        )}

        {drafts && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-300">
                {drafts.length} tarefa{drafts.length !== 1 ? 's' : ''} encontrada{drafts.length !== 1 ? 's' : ''}
                {pendencias > 0 && (
                  <span className="ml-2 text-amber-400">· {pendencias} para revisar</span>
                )}
              </p>
              <button onClick={() => setDrafts(null)} className="text-xs font-semibold text-slate-400">
                Colar outro texto
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {drafts.map((d, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl border p-4 ${
                    d.precisaRevisao ? 'border-amber-500/60 bg-amber-500/5' : 'border-slate-800 bg-slate-800/40'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <input
                      type="date"
                      value={d.data}
                      onChange={(e) => atualizarDraft(idx, 'data', e.target.value)}
                      className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-slate-200 outline-none ring-1 ring-slate-700"
                    />
                    <button
                      onClick={() => removerDraft(idx)}
                      className="text-xs font-semibold text-red-400"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                        Horário (rótulo)
                      </label>
                      <input
                        value={d.horario}
                        onChange={(e) => atualizarDraft(idx, 'horario', e.target.value)}
                        placeholder="ex: 09:30"
                        className="w-full rounded-lg bg-slate-900 px-2 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                        Horário (HH:MM p/ ordenar)
                      </label>
                      <input
                        value={d.horarioComparacao}
                        onChange={(e) => atualizarDraft(idx, 'horarioComparacao', e.target.value)}
                        placeholder="09:30"
                        className="w-full rounded-lg bg-slate-900 px-2 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Tipo</label>
                    <div className="flex flex-wrap gap-1">
                      {TIPOS.map((t) => (
                        <button
                          key={t}
                          onClick={() => atualizarDraft(idx, 'tipo', t)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            d.tipo === t ? 'bg-brand-500 text-white' : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          {TYPE_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                      Cliente / atividade
                    </label>
                    <input
                      value={d.cliente}
                      onChange={(e) => atualizarDraft(idx, 'cliente', e.target.value)}
                      className="w-full rounded-lg bg-slate-900 px-2 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                    />
                  </div>

                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                        Brinquedo
                      </label>
                      <input
                        value={d.brinquedo || ''}
                        onChange={(e) => atualizarDraft(idx, 'brinquedo', e.target.value)}
                        className="w-full rounded-lg bg-slate-900 px-2 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                        Telefone
                      </label>
                      <input
                        value={d.telefone || ''}
                        onChange={(e) => atualizarDraft(idx, 'telefone', e.target.value)}
                        className="w-full rounded-lg bg-slate-900 px-2 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                      Endereço
                    </label>
                    <input
                      value={d.endereco || ''}
                      onChange={(e) => atualizarDraft(idx, 'endereco', e.target.value)}
                      className="w-full rounded-lg bg-slate-900 px-2 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                      Observações
                    </label>
                    <textarea
                      value={d.observacoes || ''}
                      onChange={(e) => atualizarDraft(idx, 'observacoes', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg bg-slate-900 px-2 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={adicionarLinhaEmBranco}
              className="rounded-xl bg-slate-800 py-3 text-sm font-semibold text-slate-200"
            >
              + Adicionar tarefa manualmente
            </button>
          </>
        )}
      </div>

      {drafts && drafts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-900/95 p-4 backdrop-blur">
          <button
            onClick={salvar}
            disabled={salvando}
            className="mx-auto block w-full max-w-xl rounded-xl bg-emerald-600 py-3 text-base font-bold text-white disabled:opacity-50"
          >
            {salvando ? 'SALVANDO...' : `SALVAR ${drafts.length} TAREFA${drafts.length !== 1 ? 'S' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
