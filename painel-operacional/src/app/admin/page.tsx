'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { useLocalizacoes } from '@/lib/useLocalizacoes';
import { todayISO } from '@/lib/format';
import { UserRole } from '@/lib/authTypes';
import MenuLateral from '@/components/MenuLateral';

const MapaOperadores = dynamic(() => import('@/components/MapaOperadores'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-slate-500">Carregando mapa...</div>,
});

function minutosDesde(ms: number): number {
  return Math.max(0, Math.floor((Date.now() - ms) / 60000));
}

function minutosAtraso(horarioComparacao?: string): number | null {
  if (!horarioComparacao) return null;
  const [h, m] = horarioComparacao.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const previsto = new Date();
  previsto.setHours(h, m, 0, 0);
  const diff = Math.floor((Date.now() - previsto.getTime()) / 60000);
  return diff > 0 ? diff : 0;
}

export default function AdminPage() {
  const { profile, criarUsuario } = useAuth();
  const ehAdmin = profile?.role === 'admin';
  const operadores = useLocalizacoes(ehAdmin);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [role, setRole] = useState<UserRole>('operador');
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const listaOrdenada = useMemo(
    () => [...operadores].sort((a, b) => a.nome.localeCompare(b.nome)),
    [operadores]
  );

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900">
        <p className="text-slate-400">Carregando...</p>
      </main>
    );
  }

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

  async function criar() {
    setMensagem(null);
    setSalvando(true);
    try {
      await criarUsuario(email, senha, nome, role);
      setMensagem(`Login criado para ${nome} (${role === 'admin' ? 'admin' : 'operador'}). Repasse e-mail e senha para ele instalar o app.`);
      setEmail('');
      setSenha('');
      setNome('');
      setRole('operador');
      setMostrarForm(false);
    } catch (e) {
      setMensagem(e instanceof Error ? e.message : 'Erro ao criar usuário.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-900">
      <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-900/95 p-4">
        <MenuLateral />
        <div>
          <h1 className="text-lg font-bold text-slate-50">Monitoramento de equipe</h1>
          <p className="text-xs text-slate-400">{todayISO()}</p>
        </div>
      </header>

      <div className="h-72 shrink-0 border-b border-slate-800">
        <MapaOperadores operadores={listaOrdenada} />
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Equipe em campo</h2>
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200"
          >
            + Adicionar pessoa
          </button>
        </div>

        {mostrarForm && (
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail para login"
              type="email"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
            />
            <input
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha (mín. 6 caracteres)"
              type="text"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
            />
            <div className="flex gap-1">
              <button
                onClick={() => setRole('operador')}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
                  role === 'operador' ? 'bg-brand-500 text-white' : 'bg-slate-900 text-slate-400'
                }`}
              >
                Operador
              </button>
              <button
                onClick={() => setRole('admin')}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
                  role === 'admin' ? 'bg-brand-500 text-white' : 'bg-slate-900 text-slate-400'
                }`}
              >
                Admin
              </button>
            </div>
            <button
              onClick={criar}
              disabled={salvando || !nome || !email || senha.length < 6}
              className="rounded-lg bg-brand-500 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {salvando ? 'Criando...' : 'Criar login'}
            </button>
          </div>
        )}

        {mensagem && <p className="text-sm text-emerald-400">{mensagem}</p>}

        {listaOrdenada.length === 0 && (
          <p className="text-sm text-slate-500">
            Nenhum operador com localização ainda. Assim que alguém logar no app pelo celular, aparece aqui.
          </p>
        )}

        {listaOrdenada.map((op) => {
          const atraso = minutosAtraso(op.tarefaHorarioComparacao);
          const semSinalHaMuito = minutosDesde(op.atualizadoEm) > 5;
          return (
            <div key={op.uid} className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100">{op.nome}</span>
                {semSinalHaMuito && (
                  <span className="text-xs font-semibold text-amber-400">
                    sem sinal há {minutosDesde(op.atualizadoEm)} min
                  </span>
                )}
              </div>
              {op.tarefaAtual && (
                <p className="mt-1 text-sm text-slate-300">
                  {op.tarefaAtual} {op.tarefaHorario ? `· ${op.tarefaHorario}` : ''}
                </p>
              )}
              <div className="mt-2 flex gap-4 text-xs">
                <span className="text-slate-400">Parado há {minutosDesde(op.paradoDesde)} min</span>
                {atraso !== null && atraso > 0 && (
                  <span className="font-semibold text-red-400">{atraso} min de atraso</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
