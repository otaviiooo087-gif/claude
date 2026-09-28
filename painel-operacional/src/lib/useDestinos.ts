'use client';

import { useEffect, useState } from 'react';
import { LocalizacaoDoc } from './useLiveLocation';
import { chaveEndereco, geocodar } from './geocode';

export type DestinoMap = Record<string, { lat: number; lng: number }>;

/** Geocodifica o endereço da tarefa atual de cada operador (uma vez por endereço, com cache). */
export function useDestinos(operadores: LocalizacaoDoc[]): DestinoMap {
  const [destinos, setDestinos] = useState<DestinoMap>({});

  useEffect(() => {
    let cancelado = false;
    const uidsComEndereco = new Set<string>();

    operadores.forEach((op) => {
      const chave = chaveEndereco(op.tarefaEndereco, op.tarefaCidade);
      if (!chave) return;
      uidsComEndereco.add(op.uid);

      geocodar(chave).then((coord) => {
        if (cancelado || !coord) return;
        setDestinos((atual) => {
          const existente = atual[op.uid];
          if (existente && existente.lat === coord.lat && existente.lng === coord.lng) return atual;
          return { ...atual, [op.uid]: coord };
        });
      });
    });

    setDestinos((atual) => {
      const chaves = Object.keys(atual);
      const semAlteracao = chaves.every((uid) => uidsComEndereco.has(uid));
      if (semAlteracao) return atual;
      const filtrado: DestinoMap = {};
      chaves.forEach((uid) => {
        if (uidsComEndereco.has(uid)) filtrado[uid] = atual[uid];
      });
      return filtrado;
    });

    return () => {
      cancelado = true;
    };
  }, [operadores]);

  return destinos;
}
