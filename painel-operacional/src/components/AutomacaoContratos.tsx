'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/useAuth';
import { Contrato, ouvirContratos } from '@/lib/contracts';
import { ouvirAssinaturas } from '@/lib/contratoPublico';
import { LogisticaContrato, ouvirLogisticaContratos, salvarLogisticaContrato } from '@/lib/logisticaContratos';
import { buscarProdutos } from '@/lib/produtos';

/**
 * Automação do admin: assim que um contrato aparece como ASSINADO, a logística (montagem + retirada,
 * com checklist) é gerada e vai pro Planejamento de logística. Roda em qualquer tela do admin; como
 * não há servidor, dispara na hora em que o painel está aberto ou na próxima vez que o admin abrir.
 */
export default function AutomacaoContratos() {
  const { profile } = useAuth();
  const ehAdmin = profile?.role === 'admin';
  const estado = useRef<{
    contratos: Contrato[] | null;
    assinados: Record<string, number> | null;
    logistica: Record<string, LogisticaContrato> | null;
    gerando: Set<string>;
  }>({ contratos: null, assinados: null, logistica: null, gerando: new Set() });

  useEffect(() => {
    if (!ehAdmin) return;
    const e = estado.current;

    async function conferir() {
      if (!e.contratos || !e.assinados || !e.logistica) return;
      for (const c of e.contratos) {
        if (c.status === 'CANCELADO') continue;
        if (!c.tokenAssinatura || !e.assinados[c.tokenAssinatura]) continue;
        if (e.logistica[c.id] || e.gerando.has(c.id)) continue;
        e.gerando.add(c.id);
        try {
          await salvarLogisticaContrato(c, await buscarProdutos(), 'assinatura');
        } catch {
          e.gerando.delete(c.id); // tenta de novo na próxima atualização
        }
      }
    }

    const fns = [
      ouvirContratos((l) => {
        e.contratos = l;
        conferir();
      }),
      ouvirAssinaturas((m) => {
        e.assinados = m;
        conferir();
      }),
      ouvirLogisticaContratos((m) => {
        e.logistica = m;
        conferir();
      }),
    ];
    return () => fns.forEach((f) => f());
  }, [ehAdmin]);

  return null;
}
