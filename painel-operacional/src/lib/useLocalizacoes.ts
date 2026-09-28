'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { LocalizacaoDoc } from './useLiveLocation';

export function useLocalizacoes(ativo: boolean) {
  const [localizacoes, setLocalizacoes] = useState<LocalizacaoDoc[]>([]);

  useEffect(() => {
    if (!ativo) return;
    const unsubscribe = onSnapshot(collection(getFirebaseDb(), 'localizacoes'), (snap) => {
      setLocalizacoes(snap.docs.map((d) => d.data() as LocalizacaoDoc));
    });
    return unsubscribe;
  }, [ativo]);

  return localizacoes;
}
