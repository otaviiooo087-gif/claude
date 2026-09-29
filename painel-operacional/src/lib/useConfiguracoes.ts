'use client';

import { useEffect, useState } from 'react';
import { Configuracoes, ouvirConfiguracoes } from './configuracoes';

export function useConfiguracoes(): Configuracoes {
  const [config, setConfig] = useState<Configuracoes>({});
  useEffect(() => ouvirConfiguracoes(setConfig), []);
  return config;
}
