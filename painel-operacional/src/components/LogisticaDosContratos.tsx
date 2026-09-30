'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserProfile } from '@/lib/authTypes';
import { listarUsuarios } from '@/lib/usuarios';
import { LogisticaContrato, atribuirTarefaDoContrato, excluirLogisticaContrato, ouvirLogisticaContratos } from '@/lib/logisticaContratos';
import { TarefaComOperador, ouvirTodasTarefasAtribuidas } from '@/lib/tarefasAtribuidas';
import { STATUS_LABELS, TYPE_LABELS, Task } from '@/lib/types';

/** Logística gerada sozinha dos contratos assinados: o admin só escolhe quem pega cada tarefa. */
export default function LogisticaDosContratos() {
  const [lista, setLista] = useState<Record<string, LogisticaContrato>>({});
  const [operadores, setOperadores] = useState<UserProfile[]>([]);
  const [andamento, setAndamento] = useState<TarefaComOperador[]>([]);
  const [escolha, setEscolha] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    listarUsuarios().then(setOperadores);
    const a = ouvirLogisticaContratos(setLista);
    const b = ouvirTodasTarefasAtribuidas(setAndamento);
    return () => {
      a();
      b();
    };
  }, []);

  const ordenadas = useMemo(
    () => Object.values(lista).sort((x, y) => x.dataEvento.localeCompare(y.dataEvento)),
    [lista]
  );
  if (ordenadas.length === 0) return null;

  async function atribuir(l: LogisticaContrato, tarefa: Task, uid: string) {
    const op = operadores.find((o) => o.uid === uid);
    if (!op) return;
    setErro(null);
    setEnviando(tarefa.id);
    try {
      await atribuirTarefaDoContrato(l.contratoId, tarefa, { uid: op.uid, nome: op.nome });
    } catch {
      setErro('Não consegui atribuir. Confira a internet e se as regras do Firestore foram republicadas.');
    } finally {
      setEnviando(null);
    }
  }

  async function atribuirTudo(l: LogisticaContrato, uid: string) {
    for (const t of l.tarefas) if (!l.atribuidas[t.id]) await atribuir(l, t, uid);
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-bold text-slate-100">📦 Logística dos contratos assinados</h2>
        <p className="text-xs text-slate-500">
          Gerada automaticamente quando o cliente assina: montagem no horário de início, retirada no de término,
          com o checklist das peças. É só escolher o operador.
        </p>
      </div>
      {erro && <p className="text-xs text-red-400">{erro}</p>}

      {ordenadas.map((l) => (
        <div key={l.contratoId} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-100">{l.cliente}</p>
              <p className="text-xs text-slate-400">
                {l.dataEvento.split('-').reverse().join('/')} · {l.tarefas[0]?.brinquedo}
              </p>
            </div>
            <button
              onClick={() => excluirLogisticaContrato(l.contratoId)}
              className="shrink-0 text-[10px] font-bold uppercase text-slate-500"
            >
              Remover
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {l.tarefas.map((t) => {
              const atrib = l.atribuidas[t.id];
              const real = andamento.find((x) => x.task.id === t.id);
              return (
                <div key={t.id} className="rounded-xl bg-slate-900/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-200">
                      {TYPE_LABELS[t.tipo]} · {t.horario}
                    </span>
                    <span className="text-[10px] text-slate-500">{t.checklist.length} peças</span>
                  </div>
                  {atrib ? (
                    <p className="mt-1 text-xs font-semibold text-emerald-400">
                      ✔ {operadores.find((o) => o.uid === (real?.uid ?? atrib.uid))?.nome ?? atrib.nome}
                      {real ? ` · ${STATUS_LABELS[real.task.status]}` : ''}
                    </p>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <select
                        value={escolha[t.id] ?? ''}
                        onChange={(e) => setEscolha({ ...escolha, [t.id]: e.target.value })}
                        className="min-w-0 flex-1 rounded-lg bg-slate-800 px-2 py-1.5 text-xs text-slate-100 outline-none ring-1 ring-slate-700"
                      >
                        <option value="">Escolher operador…</option>
                        {operadores.map((o) => (
                          <option key={o.uid} value={o.uid}>
                            {o.nome}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => escolha[t.id] && atribuir(l, t, escolha[t.id])}
                        disabled={!escolha[t.id] || enviando === t.id}
                        className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                      >
                        {enviando === t.id ? '...' : 'Atribuir'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {l.tarefas.some((t) => !l.atribuidas[t.id]) && operadores.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Atribuir as duas para:</span>
              {operadores.map((o) => (
                <button
                  key={o.uid}
                  onClick={() => atribuirTudo(l, o.uid)}
                  className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200"
                >
                  {o.nome}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
