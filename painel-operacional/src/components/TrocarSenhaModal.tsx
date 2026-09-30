'use client';

import { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useAuth } from '@/lib/useAuth';

interface Props {
  onFechar: () => void;
}

export default function TrocarSenhaModal({ onFechar }: Props) {
  const { user } = useAuth();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!user?.email) return;
    setErro(null);
    if (nova.length < 6) return setErro('A senha nova precisa ter pelo menos 6 caracteres.');
    if (nova !== confirmar) return setErro('A confirmação não bate com a senha nova.');

    setSalvando(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, atual));
      await updatePassword(user, nova);
      setOk(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setErro(
        msg.includes('invalid-credential') || msg.includes('wrong-password')
          ? 'A senha atual está incorreta.'
          : msg.includes('too-many-requests')
          ? 'Muitas tentativas. Espere alguns minutos.'
          : 'Não consegui trocar a senha. Tente de novo.'
      );
    } finally {
      setSalvando(false);
    }
  }

  const campo =
    'w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700';

  return (
    <div className="fixed inset-0 z-[10001] flex items-end bg-black/60 sm:items-center sm:justify-center" onClick={onFechar}>
      <div
        className="w-full max-w-sm rounded-t-3xl bg-slate-900 p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-base font-bold text-slate-50">Trocar minha senha</h2>
        {ok ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-emerald-400">Senha alterada com sucesso.</p>
            <button onClick={onFechar} className="rounded-xl bg-brand-500 py-3 text-sm font-bold text-white">
              Fechar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input type="password" value={atual} onChange={(e) => setAtual(e.target.value)} placeholder="Senha atual" autoComplete="current-password" className={campo} />
            <input type="password" value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Senha nova (mín. 6 caracteres)" autoComplete="new-password" className={campo} />
            <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} placeholder="Repita a senha nova" autoComplete="new-password" className={campo} />
            {erro && <p className="text-xs text-red-400">{erro}</p>}
            <div className="flex gap-2">
              <button onClick={onFechar} className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-bold text-slate-200">
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando || !atual || !nova || !confirmar}
                className="flex-1 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
