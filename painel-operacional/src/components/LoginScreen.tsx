'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/useAuth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    setErro(null);
    setCarregando(true);
    try {
      await login(email, senha);
    } catch (e) {
      setErro(e instanceof Error ? mensagemAmigavel(e.message) : 'Erro ao entrar.');
    } finally {
      setCarregando(false);
    }
  }

  function mensagemAmigavel(msg: string): string {
    if (msg.includes('invalid-credential') || msg.includes('wrong-password')) return 'E-mail ou senha incorretos.';
    if (msg.includes('user-not-found')) return 'Não existe conta com esse e-mail.';
    if (msg.includes('network-request-failed')) return 'Sem conexão com a internet.';
    return msg;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-900 p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-xl font-bold text-slate-50">Zimba Festa</h1>
        <p className="mb-6 text-center text-sm text-slate-400">Entre com sua conta</p>

        <div className="flex flex-col gap-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            type="email"
            autoComplete="username"
            className="rounded-xl bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-brand-500"
          />
          <input
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Senha"
            type="password"
            autoComplete="current-password"
            className="rounded-xl bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-brand-500"
          />

          {erro && <p className="text-sm text-red-400">{erro}</p>}

          <button
            onClick={enviar}
            disabled={carregando || !email || !senha}
            className="rounded-xl bg-brand-500 py-3 text-base font-bold text-white disabled:opacity-50"
          >
            {carregando ? 'Entrando...' : 'ENTRAR'}
          </button>

          <p className="text-center text-xs text-slate-500">
            Sem conta ainda? Peça ao administrador para criar seu login.
          </p>
        </div>
      </div>
    </main>
  );
}
