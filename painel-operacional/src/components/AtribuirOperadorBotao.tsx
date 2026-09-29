'use client';

import { useEffect, useState } from 'react';
import { Task } from '@/lib/types';
import { UserProfile } from '@/lib/authTypes';
import { listarUsuarios } from '@/lib/usuarios';
import { atribuirTarefas } from '@/lib/tarefasAtribuidas';

/** Botão discreto pro admin atribuir uma tarefa da própria agenda a um operador. */
export default function AtribuirOperadorBotao({ task }: { task: Task }) {
  const [aberto, setAberto] = useState(false);
  const [operadores, setOperadores] = useState<UserProfile[]>([]);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);

  useEffect(() => {
    if (aberto && operadores.length === 0) listarUsuarios().then(setOperadores);
  }, [aberto, operadores.length]);

  async function atribuir(uid: string, nome: string) {
    setEnviando(uid);
    try {
      await atribuirTarefas(uid, [task]);
      setFeito(nome);
      setTimeout(() => {
        setAberto(false);
        setFeito(null);
      }, 1200);
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase text-slate-300"
      >
        Atribuir
      </button>
      {aberto && (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl bg-slate-800 p-1.5 shadow-2xl ring-1 ring-slate-700">
          {feito ? (
            <p className="px-2 py-2 text-xs font-semibold text-emerald-400">Atribuído a {feito}!</p>
          ) : operadores.length === 0 ? (
            <p className="px-2 py-2 text-xs text-slate-500">Nenhum operador cadastrado.</p>
          ) : (
            operadores.map((op) => (
              <button
                key={op.uid}
                onClick={() => atribuir(op.uid, op.nome)}
                disabled={enviando === op.uid}
                className="block w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-200 active:bg-slate-700 disabled:opacity-50"
              >
                {enviando === op.uid ? 'Enviando...' : op.nome}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
