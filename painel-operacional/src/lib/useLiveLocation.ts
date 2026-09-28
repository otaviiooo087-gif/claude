'use client';

import { useEffect, useRef, useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { distanciaMetros } from './geo';

const INTERVALO_MINIMO_MS = 15000;
const DISTANCIA_MOVIMENTO_METROS = 30;

export type LocalizacaoDoc = {
  uid: string;
  nome: string;
  lat: number;
  lng: number;
  precisao: number;
  atualizadoEm: number;
  paradoDesde: number;
  tarefaAtual?: string;
  tarefaHorario?: string;
  tarefaHorarioComparacao?: string;
};

/**
 * Enquanto `ativo`, acompanha a posição do dispositivo e mantém o documento
 * `localizacoes/{uid}` atualizado para o admin ver em tempo real.
 * `paradoDesde` só muda quando o operador se desloca mais que o limiar —
 * pequenas variações de GPS parado não resetam a contagem de "minutos parado".
 */
export function useLiveLocation(uid: string | null, nome: string, ativo: boolean) {
  const [erro, setErro] = useState<string | null>(null);
  const ultimaPosicao = useRef<{ lat: number; lng: number } | null>(null);
  const paradoDesdeRef = useRef<number>(Date.now());
  const ultimoEnvioRef = useRef<number>(0);

  useEffect(() => {
    if (!ativo || !uid || typeof navigator === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const agora = Date.now();
        const atual = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        if (!ultimaPosicao.current) {
          paradoDesdeRef.current = agora;
        } else if (distanciaMetros(ultimaPosicao.current, atual) > DISTANCIA_MOVIMENTO_METROS) {
          paradoDesdeRef.current = agora;
        }
        ultimaPosicao.current = atual;

        if (agora - ultimoEnvioRef.current < INTERVALO_MINIMO_MS) return;
        ultimoEnvioRef.current = agora;

        setDoc(
          doc(getFirebaseDb(), 'localizacoes', uid),
          {
            uid,
            nome,
            lat: atual.lat,
            lng: atual.lng,
            precisao: pos.coords.accuracy,
            atualizadoEm: agora,
            paradoDesde: paradoDesdeRef.current,
            _servidor: serverTimestamp(),
          },
          { merge: true }
        ).catch((e) => setErro(e.message));
      },
      (err) => setErro(err.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [ativo, uid, nome]);

  return { erro };
}
