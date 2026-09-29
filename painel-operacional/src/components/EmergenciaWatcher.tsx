'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { Emergencia, ouvirEmergenciasAbertas, resolverEmergencia } from '@/lib/emergencias';

/** Toca um bipe curto sem depender de nenhum arquivo de áudio. */
function tocarAlerta() {
  try {
    type WindowComWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };
    const Ctx = window.AudioContext || (window as WindowComWebkitAudio).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.25;
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 700);
  } catch {
    // silencioso: alerta visual já basta se o som falhar
  }
}

/**
 * Fica ouvindo emergências disparadas por qualquer operador enquanto o admin
 * estiver com o app aberto (em qualquer tela) — vibra, toca um bipe e mostra
 * uma faixa vermelha fixa no topo. Só funciona com o app aberto (em primeiro
 * ou segundo plano); não acorda o celular com o app fechado, isso exigiria
 * notificação push com servidor próprio.
 */
export default function EmergenciaWatcher() {
  const { profile, configured } = useAuth();
  const ehAdmin = profile?.role === 'admin';
  const [emergencias, setEmergencias] = useState<Emergencia[]>([]);
  const vistosRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!configured || !ehAdmin) return;
    return ouvirEmergenciasAbertas((lista) => {
      if (vistosRef.current) {
        const novos = lista.filter((e) => !vistosRef.current!.has(e.id));
        if (novos.length > 0) {
          if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
          tocarAlerta();
        }
      }
      vistosRef.current = new Set(lista.map((e) => e.id));
      setEmergencias(lista);
    });
  }, [configured, ehAdmin]);

  if (!ehAdmin || emergencias.length === 0) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] flex flex-col gap-2 p-3">
      {emergencias.map((e) => (
        <div
          key={e.id}
          className="flex items-center justify-between gap-3 rounded-xl bg-red-600 px-4 py-3 shadow-2xl"
        >
          <div>
            <p className="text-sm font-extrabold text-white">🚨 EMERGÊNCIA — {e.operadorNome}</p>
            <p className="text-xs text-red-100">{new Date(e.criadoEm).toLocaleTimeString('pt-BR')}</p>
          </div>
          <button
            onClick={() => resolverEmergencia(e.id)}
            className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-bold text-red-600"
          >
            Resolver
          </button>
        </div>
      ))}
    </div>
  );
}
