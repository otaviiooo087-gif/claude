'use client';

import { useAuth } from '@/lib/useAuth';
import LoginScreen from './LoginScreen';

/**
 * Sem Firebase configurado (.env.local ausente), o app funciona exatamente
 * como antes: sem login, 100% local. O login só passa a ser exigido depois
 * que o admin configura o backend — nunca trava quem já usa o app hoje.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { configured, loading, user, profile, logout } = useAuth();

  if (!configured) return <>{children}</>;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900">
        <p className="text-slate-400">Carregando...</p>
      </main>
    );
  }

  if (!user) return <LoginScreen />;

  // Login existe no Firebase mas o perfil foi apagado pelo admin: acesso removido.
  if (!profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-center">
        <p className="text-lg font-bold text-slate-100">Acesso removido</p>
        <p className="max-w-xs text-sm text-slate-400">
          Essa conta não tem mais acesso ao Zimba Festa. Se isso for um engano, fale com o administrador.
        </p>
        <button onClick={logout} className="rounded-xl bg-slate-800 px-6 py-3 text-sm font-bold text-slate-200">
          Sair
        </button>
      </main>
    );
  }

  return <>{children}</>;
}
