'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserProfile } from '@/lib/authTypes';
import { listarUsuarios } from '@/lib/usuarios';
import {
  LogisticaContrato,
  atribuirTarefaDoContrato,
  atualizarTarefasPlanejadas,
  desatribuirTarefaDoContrato,
  apenasAtivas,
  excluirLogisticaCompleta,
  ouvirLogisticaContratos,
} from '@/lib/logisticaContratos';
import EditarTarefaAdminModal from './EditarTarefaAdminModal';
import ConfirmDialog from './ConfirmDialog';
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
  const [editandoPlano, setEditandoPlano] = useState<{ l: LogisticaContrato; t: Task } | null>(null);
  const [editandoReal, setEditandoReal] = useState<TarefaComOperador | null>(null);
  const [excluindo, setExcluindo] = useState<LogisticaContrato | null>(null);

  useEffect(() => {
    listarUsuarios().then(setOperadores);
    const a = ouvirLogisticaContratos((m) => setLista(apenasAtivas(m)));
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
            <button onClick={() => setExcluindo(l)} className="shrink-0 text-[10px] font-bold uppercase text-red-400">
              Excluir
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
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-emerald-400">
                        ✔ {operadores.find((o) => o.uid === (real?.uid ?? atrib.uid))?.nome ?? atrib.nome}
                        {real ? ` · ${STATUS_LABELS[real.task.status]}` : ''}
                      </p>
                      <div className="flex shrink-0 gap-3 text-[11px] font-bold">
                        {real && (
                          <button onClick={() => setEditandoReal(real)} className="text-slate-300">
                            Editar
                          </button>
                        )}
                        <button
                          onClick={() => desatribuirTarefaDoContrato(l.contratoId, t.id, real?.uid ?? atrib.uid).catch(() => setErro('Não consegui tirar o operador.'))}
                          className="text-amber-400"
                        >
                          Tirar operador
                        </button>
                      </div>
                    </div>
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
                      <button
                        onClick={() => setEditandoPlano({ l, t })}
                        className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200"
                      >
                        Editar
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

      {editandoPlano && (
        <EditarPlanejada
          tarefa={editandoPlano.t}
          onFechar={() => setEditandoPlano(null)}
          onSalvar={async (nova) => {
            await atualizarTarefasPlanejadas(
              editandoPlano.l.contratoId,
              editandoPlano.l.tarefas.map((x) => (x.id === nova.id ? nova : x))
            );
            setEditandoPlano(null);
          }}
          onExcluir={async () => {
            await atualizarTarefasPlanejadas(
              editandoPlano.l.contratoId,
              editandoPlano.l.tarefas.filter((x) => x.id !== editandoPlano.t.id)
            );
            setEditandoPlano(null);
          }}
        />
      )}

      {editandoReal && (
        <EditarTarefaAdminModal
          uid={editandoReal.uid}
          task={editandoReal.task}
          operadores={operadores}
          onFechar={() => setEditandoReal(null)}
        />
      )}

      {excluindo && (
        <ConfirmDialog
          message={`Excluir a logística de ${excluindo.cliente}? As tarefas também saem da agenda dos operadores.`}
          confirmLabel="EXCLUIR"
          onCancel={() => setExcluindo(null)}
          onConfirm={async () => {
            const alvo = excluindo;
            setExcluindo(null);
            const porTarefa: Record<string, string> = {};
            andamento.forEach((x) => (porTarefa[x.task.id] = x.uid));
            await excluirLogisticaCompleta(alvo, porTarefa).catch(() => setErro('Não consegui excluir.'));
          }}
        />
      )}
    </section>
  );
}

function EditarPlanejada({
  tarefa,
  onSalvar,
  onExcluir,
  onFechar,
}: {
  tarefa: Task;
  onSalvar: (t: Task) => Promise<void>;
  onExcluir: () => Promise<void>;
  onFechar: () => void;
}) {
  const [f, setF] = useState<Task>(tarefa);
  const [salvando, setSalvando] = useState(false);
  const campo = 'w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700';
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onFechar}>
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-base font-bold text-slate-50">
          Editar {TYPE_LABELS[tarefa.tipo].toLowerCase()} — {tarefa.cliente}
        </h3>
        <div className="flex flex-col gap-2">
          <input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} className={campo} />
          <input
            type="time"
            value={/^\d{2}:\d{2}$/.test(f.horarioComparacao) ? f.horarioComparacao : ''}
            onChange={(e) => setF({ ...f, horarioComparacao: e.target.value, horario: e.target.value })}
            className={campo}
          />
          <input value={f.endereco ?? ''} onChange={(e) => setF({ ...f, endereco: e.target.value })} placeholder="Endereço" className={campo} />
          <input value={f.telefone ?? ''} onChange={(e) => setF({ ...f, telefone: e.target.value })} placeholder="Telefone" className={campo} />
          <textarea value={f.observacoes ?? ''} onChange={(e) => setF({ ...f, observacoes: e.target.value })} rows={3} placeholder="Observações" className={campo} />
          <button
            onClick={async () => {
              setSalvando(true);
              await onSalvar(f).finally(() => setSalvando(false));
            }}
            disabled={salvando}
            className="rounded-xl bg-brand-500 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Salvar
          </button>
          <button onClick={() => onExcluir()} disabled={salvando} className="rounded-xl bg-slate-800 py-3 text-sm font-bold text-red-400">
            Excluir esta tarefa do planejamento
          </button>
        </div>
      </div>
    </div>
  );
}
