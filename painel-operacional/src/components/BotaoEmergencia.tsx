'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { dispararEmergencia } from '@/lib/emergencias';
import ConfirmDialog from './ConfirmDialog';

export default function BotaoEmergencia() {
  const { configured, user, profile } = useAuth();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  if (!configured || !user) return null;

  async function enviar() {
    setEnviando(true);
    try {
      await dispararEmergencia(user!.uid, profile?.nome || 'Operador');
      setEnviado(true);
      setTimeout(() => setEnviado(false), 4000);
    } finally {
      setEnviando(false);
      setConfirmando(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setConfirmando(true)}
        aria-label="Emergência"
        className="fixed bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-xl font-extrabold text-white shadow-2xl active:scale-95"
      >
        SOS
      </button>

      {enviado && (
        <div className="fixed bottom-24 right-4 z-40 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-2xl">
          Emergência enviada ao admin!
        </div>
      )}

      {confirmando && (
        <ConfirmDialog
          message="Enviar alerta de emergência para o admin agora?"
          onCancel={() => setConfirmando(false)}
          onConfirm={enviar}
          confirmLabel="ENVIAR SOS"
        />
      )}
      {enviando && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60">
          <p className="text-sm font-bold text-white">Enviando...</p>
        </div>
      )}
    </>
  );
}
