'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { todayISO } from './format';

export type TrajetoMap = Record<string, { lat: number; lng: number }[]>;

/** Escuta o rastro (histórico de posições) de hoje de cada operador em `uids`. */
export function useTrajetos(uids: string[]): TrajetoMap {
  const [trajetos, setTrajetos] = useState<TrajetoMap>({});
  const chave = uids.slice().sort().join(',');

  useEffect(() => {
    if (!chave) {
      setTrajetos({});
      return;
    }
    const hoje = todayISO();
    const unsubscribers = chave.split(',').map((uid) => {
      const q = query(collection(getFirebaseDb(), 'localizacoes', uid, 'rota'), where('data', '==', hoje));
      return onSnapshot(q, (snap) => {
        const pontos = snap.docs
          .map((d) => d.data())
          .sort((a, b) => a.criadoEm - b.criadoEm)
          .map((dados) => ({ lat: dados.lat as number, lng: dados.lng as number }));
        setTrajetos((atual) => ({ ...atual, [uid]: pontos }));
      });
    });

    return () => unsubscribers.forEach((unsub) => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return trajetos;
}
