'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import MenuLateral from '@/components/MenuLateral';
import AlternarModo from '@/components/AlternarModo';
import EditarTarefaAdminModal from '@/components/EditarTarefaAdminModal';
import ClimaBadge from '@/components/ClimaBadge';
import {
  ouvirTodasTarefasAtribuidas,
  TarefaComOperador,
} from '@/lib/tarefasAtribuidas';
import { listarUsuarios } from '@/lib/usuarios';
import { UserProfile } from '@/lib/authTypes';
import { TYPE_LABELS, BASE_LOCATION } from '@/lib/types';
import { todayISO, formatDateFull, formatCurrency } from '@/lib/format';
import { chaveEndereco, geocodar } from '@/lib/geocode';
import { distanciaMetros, estimarMinutos } from '@/lib/geo';
import { buscarFechamentoDia, salvarFechamentoDia } from '@/lib/fechamentoDia';
import { useConfiguracoes } from '@/lib/useConfiguracoes';

const DURACAO_PADRAO_MIN: Record<string, number> = {
  MONTAGEM: 45,
  RETIRADA: 25,
  LOGISTICA: 15,
  EVENTO: 0,
};

function formatarHoras(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (h === 0) return `${m} min`;
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
}

function somarMinutosAoHorario(hhmm: string, minutos: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const total = Math.round(h * 60 + m + minutos) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export default function AgendaAdminPage() {
  const { profile } = useAuth();
  const ehAdmin = profile?.role === 'admin';
  const [data, setData] = useState(''); // vazio = mostra todas as datas
  const [todas, setTodas] = useState<TarefaComOperador[]>([]);
  const [operadores, setOperadores] = useState<UserProfile[]>([]);
  const [trajetoMin, setTrajetoMin] = useState<Record<string, number | null>>({});
  const [editando, setEditando] = useState<TarefaComOperador | null>(null);
  const [verCanceladas, setVerCanceladas] = useState(false);
  const [fechamento, setFechamento] = useState('');
  const config = useConfiguracoes();

  useEffect(() => {
    if (!ehAdmin) return;
    return ouvirTodasTarefasAtribuidas(setTodas);
  }, [ehAdmin]);

  useEffect(() => {
    if (!ehAdmin) return;
    listarUsuarios().then(setOperadores);
  }, [ehAdmin]);

  useEffect(() => {
    if (!ehAdmin || !data) {
      setFechamento('');
      return;
    }
    buscarFechamentoDia(data).then((h) => setFechamento(h ?? ''));
  }, [ehAdmin, data]);

  async function alterarFechamento(horario: string) {
    setFechamento(horario);
    if (data) await salvarFechamentoDia(data, horario);
  }

  const nomeOperador = (uid: string) => operadores.find((o) => o.uid === uid)?.nome || 'Operador';

  const doDia = useMemo(
    () =>
      todas.filter(
        (t) =>
          (!data || t.task.data === data) &&
          (t.task.tipo === 'MONTAGEM' || t.task.tipo === 'LOGISTICA') &&
          Boolean(t.task.cancelada) === verCanceladas
      ),
    [todas, data, verCanceladas]
  );

  // uid -> data -> tarefas daquele dia (agrupado por dia pra calcular trajeto/previsão
  // corretamente mesmo mostrando várias datas de uma vez).
  const porOperador = useMemo(() => {
    const mapa = new Map<string, Map<string, TarefaComOperador[]>>();
    doDia.forEach((t) => {
      const porData = mapa.get(t.uid) || new Map<string, TarefaComOperador[]>();
      const lista = porData.get(t.task.data) || [];
      lista.push(t);
      porData.set(t.task.data, lista);
      mapa.set(t.uid, porData);
    });
    mapa.forEach((porData) => {
      porData.forEach((lista) => {
        lista.sort((a, b) => a.task.horarioComparacao.localeCompare(b.task.horarioComparacao));
        if (config.ajudanteBuscaPrimeiro) {
          // Ordenação estável: dentro de "tem ajudante" e "não tem", mantém a ordem por horário já aplicada.
          lista.sort((a, b) => (a.task.ajudanteNome ? 0 : 1) - (b.task.ajudanteNome ? 0 : 1));
        }
      });
    });
    return mapa;
  }, [doDia, config.ajudanteBuscaPrimeiro]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const novo: Record<string, number | null> = {};
      for (const porData of porOperador.values()) {
        for (const lista of porData.values()) {
          let pontoAnterior = BASE_LOCATION.endereco;
          for (const { task } of lista) {
            const chave = chaveEndereco(task.endereco, task.cidade);
            if (!chave) {
              novo[task.id] = null;
              continue;
            }
            const [origem, destino] = await Promise.all([geocodar(pontoAnterior), geocodar(chave)]);
            novo[task.id] = origem && destino ? estimarMinutos(distanciaMetros(origem, destino)) : null;
            pontoAnterior = chave;
          }
        }
      }
      if (!cancelado) setTrajetoMin(novo);
    })();
    return () => {
      cancelado = true;
    };
  }, [porOperador]);

  function previsaoTotalOperador(lista: TarefaComOperador[]): number {
    return lista.reduce((soma, { task }) => {
      const trajeto = trajetoMin[task.id] ?? 0;
      const duracao = DURACAO_PADRAO_MIN[task.tipo] ?? 0;
      return soma + trajeto + duracao;
    }, 0);
  }

  if (!profile) return null;

  if (!ehAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-center">
        <p className="text-slate-300">Essa área é só para o admin.</p>
        <Link href="/" className="text-sm font-semibold text-brand-500">
          Voltar para o painel
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl bg-slate-900 pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-800 bg-slate-900/95 p-4 backdrop-blur">
        <MenuLateral />
        <h1 className="min-w-0 flex-1 truncate text-base font-bold text-slate-50">Agenda de eventos</h1>
        <AlternarModo />
      </header>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
          />
          {data ? (
            <>
              <p className="text-sm text-slate-400">{formatDateFull(data)}</p>
              <button onClick={() => setData('')} className="ml-auto text-xs font-semibold text-brand-500">
                Ver todas as datas
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-400">Mostrando todas as datas</p>
          )}
        </div>

        {data && (
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Horário de fechamento da agenda nesse dia
            <input
              type="time"
              value={fechamento}
              onChange={(e) => alterarFechamento(e.target.value)}
              className="rounded-lg bg-slate-800 px-2 py-1.5 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
            />
          </label>
        )}

        <div className="flex gap-1 rounded-full bg-slate-800 p-0.5 text-xs font-bold">
          <button
            onClick={() => setVerCanceladas(false)}
            className={`flex-1 rounded-full py-1.5 ${!verCanceladas ? 'bg-brand-500 text-white' : 'text-slate-400'}`}
          >
            Ativas
          </button>
          <button
            onClick={() => setVerCanceladas(true)}
            className={`flex-1 rounded-full py-1.5 ${verCanceladas ? 'bg-brand-500 text-white' : 'text-slate-400'}`}
          >
            Canceladas
          </button>
        </div>

        {porOperador.size === 0 && (
          <p className="text-sm text-slate-500">Nenhuma montagem ou logística encontrada.</p>
        )}

        {[...porOperador.entries()].map(([uid, porData]) => (
          <section key={uid} className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-slate-100">{nomeOperador(uid)}</h2>

            {[...porData.entries()]
              .sort(([dataA], [dataB]) => dataA.localeCompare(dataB))
              .map(([dataGrupo, lista]) => {
                const previsaoFim =
                  lista.length > 0
                    ? somarMinutosAoHorario(lista[0].task.horarioComparacao, previsaoTotalOperador(lista))
                    : '';
                const passaDoFechamento = data && fechamento && previsaoFim && previsaoFim > fechamento;
                return (
                  <div key={dataGrupo} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-500">{formatDateFull(dataGrupo)}</span>
                      <span className="text-xs text-slate-400">
                        Previsão: {formatarHoras(previsaoTotalOperador(lista))}
                        {previsaoFim && ` · termina ~${previsaoFim}`}
                      </span>
                    </div>
                    {passaDoFechamento && (
                      <p className="text-xs font-semibold text-red-400">
                        ⚠️ Pode terminar depois do fechamento ({fechamento}) — considere reagendar ou tirar alguma
                        parada.
                      </p>
                    )}

                    {lista.map(({ task }) => (
                      <button
                        key={task.id}
                        onClick={() => setEditando({ uid, task })}
                        className={`rounded-2xl border p-4 text-left ${
                          task.cancelada
                            ? 'border-slate-800 bg-slate-800/20 opacity-60'
                            : 'border-slate-800 bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-100">{task.horarioComparacao}</span>
                          <div className="flex items-center gap-1">
                            <ClimaBadge endereco={task.endereco} cidade={task.cidade} data={task.data} />
                            <span className="text-xs uppercase tracking-wide text-slate-400">
                              {TYPE_LABELS[task.tipo]}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-300">{task.cliente}</p>
                        {task.brinquedo && <p className="text-xs text-slate-500">{task.brinquedo}</p>}
                        {task.ajudanteNome && <p className="text-xs text-slate-500">Ajudante: {task.ajudanteNome}</p>}
                        <div className="mt-2 flex justify-between text-xs text-slate-400">
                          <span>
                            {trajetoMin[task.id] != null
                              ? `~${trajetoMin[task.id]} min de trajeto até aqui`
                              : 'trajeto: —'}
                          </span>
                          {task.valor !== undefined && <span>{formatCurrency(task.valor)}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
          </section>
        ))}
      </div>

      {editando && (
        <EditarTarefaAdminModal
          uid={editando.uid}
          task={editando.task}
          operadores={operadores}
          onFechar={() => setEditando(null)}
        />
      )}
    </main>
  );
}
