'use client';

import { useEffect, useState } from 'react';
import { chaveEndereco, geocodar } from './geocode';
import { buscarPrevisaoTempo, PrevisaoTempo } from './clima';

export function useClimaEndereco(endereco: string | undefined, cidade: string | undefined, dataISO: string): PrevisaoTempo | null {
  const [previsao, setPrevisao] = useState<PrevisaoTempo | null>(null);

  useEffect(() => {
    let cancelado = false;
    setPrevisao(null);
    const chave = chaveEndereco(endereco, cidade);
    if (!chave || !dataISO) return;

    (async () => {
      const coord = await geocodar(chave);
      if (!coord || cancelado) return;
      const clima = await buscarPrevisaoTempo(coord.lat, coord.lng, dataISO);
      if (!cancelado) setPrevisao(clima);
    })();

    return () => {
      cancelado = true;
    };
  }, [endereco, cidade, dataISO]);

  return previsao;
}
