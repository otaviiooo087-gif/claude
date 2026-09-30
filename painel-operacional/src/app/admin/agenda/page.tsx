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

export default function AgendaAdminPage() {
  const { profile } = useAuth();
  const ehAdmin = profile?.role === 'admin';
  const [data, setData] = useState(todayISO());
  const [todas, setTodas] = useState<TarefaComOperador[]>([]);
  const [operadores, setOperadores] = useState<UserProfile[]>([]);
  const [trajetoMin, setTrajetoMin] = useState<Record<string, number | null>>({});
  const [editando, setEditando] = useState<TarefaComOperador | null>(null);
  const [verCanceladas, setVerCanceladas] = useState(false);

  useEffect(() => {
    if (!ehAdmin) return;
    return ouvirTodasTarefasAtribuidas(setTodas);
  }, [ehAdmin]);

  useEffect(() => {
    if (!ehAdmin) return;
    listarUsuarios().then(setOperadores);
  }, [ehAdmin]);

  const nomeOperador = (uid: string) => operadores.find((o) => o.uid === uid)?.nome || 'Operador';

  const doDia = useMemo(
    () =>
      todas.filter(
        (t) =>
          t.task.data === data &&
          (t.task.tipo === 'MONTAGEM' || t.task.tipo === 'LOGISTICA') &&
          Boolean(t.task.cancelada) === verCanceladas
      ),
    [todas, data, verCanceladas]
  );

  const porOperador = useMemo(() => {
    const mapa = new Map<string, TarefaComOperador[]>();
    doDia.forEach((t) => {
      const lista = mapa.get(t.uid) || [];
      lista.push(t);
      mapa.set(t.uid, lista);
    });
    mapa.forEach((lista) => lista.sort((a, b) => a.task.horarioComparacao.localeCompare(b.task.horarioComparacao)));
    return mapa;
  }, [doDia]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const novo: Record<string, number | null> = {};
      for (const lista of porOperador.values()) {
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
          <p className="text-sm text-slate-400">{formatDateFull(data)}</p>
        </div>

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
          <p className="text-sm text-slate-500">Nenhuma montagem ou logística nessa data.</p>
        )}

        {[...porOperador.entries()].map(([uid, lista]) => (
          <section key={uid} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-100">{nomeOperador(uid)}</h2>
              <span className="text-xs text-slate-400">
                Previsão do dia: {formatarHoras(previsaoTotalOperador(lista))}
              </span>
            </div>

            {lista.map(({ task }) => (
              <button
                key={task.id}
                onClick={() => setEditando({ uid, task })}
                className={`rounded-2xl border p-4 text-left ${
                  task.cancelada ? 'border-slate-800 bg-slate-800/20 opacity-60' : 'border-slate-800 bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">{task.horarioComparacao}</span>
                  <div className="flex items-center gap-1">
                    <ClimaBadge endereco={task.endereco} cidade={task.cidade} data={task.data} />
                    <span className="text-xs uppercase tracking-wide text-slate-400">{TYPE_LABELS[task.tipo]}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-300">{task.cliente}</p>
                {task.brinquedo && <p className="text-xs text-slate-500">{task.brinquedo}</p>}
                {task.ajudanteNome && <p className="text-xs text-slate-500">Ajudante: {task.ajudanteNome}</p>}
                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>
                    {trajetoMin[task.id] != null ? `~${trajetoMin[task.id]} min de trajeto até aqui` : 'trajeto: —'}
                  </span>
                  {task.valor !== undefined && <span>{formatCurrency(task.valor)}</span>}
                </div>
              </button>
            ))}
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
