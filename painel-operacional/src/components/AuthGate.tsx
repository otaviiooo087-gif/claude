'use client';

import { useAuth } from '@/lib/useAuth';
import LoginScreen from './LoginScreen';

/**
 * Sem Firebase configurado (.env.local ausente), o app funciona exatamente
 * como antes: sem login, 100% local. O login só passa a ser exigido depois
 * que o admin configura o backend — nunca trava quem já usa o app hoje.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { configured, loading, user } = useAuth();

  if (!configured) return <>{children}</>;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900">
        <p className="text-slate-400">Carregando...</p>
      </main>
    );
  }

  if (!user) return <LoginScreen />;

  return <>{children}</>;
}
