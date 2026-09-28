import { Contrato } from './contracts';

/**
 * Dias até a próxima ocorrência do dia/mês de `dataISO` (o ano salvo é
 * ignorado — a data se repete todo ano, tipo aniversário). Retorna 0 se for
 * hoje, e sempre um valor >= 0 (rola pro ano seguinte se já passou).
 */
export function diasAteProximaData(dataISO: string, hoje = new Date()): number {
  const [, mesStr, diaStr] = dataISO.split('-');
  const mes = Number(mesStr) - 1;
  const dia = Number(diaStr);

  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  let proximo = new Date(hoje.getFullYear(), mes, dia);
  if (proximo < hojeSemHora) {
    proximo = new Date(hoje.getFullYear() + 1, mes, dia);
  }

  return Math.round((proximo.getTime() - hojeSemHora.getTime()) / 86400000);
}

export function formatDiaMes(dataISO: string): string {
  const [, m, d] = dataISO.split('-').map(Number);
  return new Date(2000, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

export interface LembreteProximo {
  contrato: Contrato;
  dias: number;
}

/** Contratos com data de lembrete nos próximos `janelaDias` dias (padrão: 5). */
export function lembretesProximos(contratos: Contrato[], janelaDias = 5): LembreteProximo[] {
  return contratos
    .filter((c) => c.dataLembrete)
    .map((c) => ({ contrato: c, dias: diasAteProximaData(c.dataLembrete!) }))
    .filter((l) => l.dias <= janelaDias)
    .sort((a, b) => a.dias - b.dias);
}

export function mensagemLembrete(contrato: Contrato): string {
  const motivo = contrato.motivoLembrete?.trim() || 'uma data especial';
  const dataFormatada = contrato.dataLembrete ? formatDiaMes(contrato.dataLembrete) : '';
  return `Bom dia, ${contrato.cliente}! Tudo bem? Vi aqui que ${motivo} é dia ${dataFormatada} 🎉 Gostaria de alugar um brinquedo para comemorar?`;
}
