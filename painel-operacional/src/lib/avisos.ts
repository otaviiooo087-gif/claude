import { Configuracoes } from './configuracoes';
import { Task } from './types';
import { MENSAGEM_ATRASO, MENSAGEM_CUIDADOS_POS_MONTAGEM, mensagemEstouIndo } from './format';

export function substituirPlaceholders(template: string, valores: Record<string, string>): string {
  return Object.entries(valores).reduce((txt, [chave, valor]) => txt.split(`{${chave}}`).join(valor), template);
}

/** Se o admin customizou o aviso em Configurações, usa o template dele; senão cai no padrão do sistema. */
export function textoEstouIndo(config: Configuracoes, tipo: Task['tipo'], cliente: string, minutos: string): string {
  if (config.avisoEstouIndo) return substituirPlaceholders(config.avisoEstouIndo, { cliente, minutos });
  return mensagemEstouIndo(tipo, minutos);
}

export function textoCuidadosPosMontagem(config: Configuracoes, cliente: string): string {
  if (config.avisoCuidadosPosMontagem) return substituirPlaceholders(config.avisoCuidadosPosMontagem, { cliente });
  return MENSAGEM_CUIDADOS_POS_MONTAGEM;
}

export function textoAtraso(config: Configuracoes, cliente: string): string {
  if (config.avisoAtraso) return substituirPlaceholders(config.avisoAtraso, { cliente });
  return MENSAGEM_ATRASO;
}
