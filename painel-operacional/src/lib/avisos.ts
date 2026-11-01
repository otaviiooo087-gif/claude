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

export const MENSAGEM_PEDIR_STORY = `Oi, {cliente}! 🎈 Que bom que deu tudo certo com a montagem! Se puder, tire uma foto ou vídeo do brinquedo na sua festa e poste nos stories marcando a gente: @zimbafestas 💛 Adoramos ver a alegria da criançada! Obrigado!`;

export const MENSAGEM_AVALIACAO_GOOGLE = `Oi, {cliente}! Muito obrigado por escolher a Zimba Festas 🎈 Se gostou do nosso serviço, pode nos ajudar com uma avaliação rapidinha no Google? Leva 1 minuto e faz muita diferença pra gente: {link} 🙏⭐`;

export function textoPedirStory(config: Configuracoes, cliente: string): string {
  return substituirPlaceholders(config.avisoPedirStory || MENSAGEM_PEDIR_STORY, { cliente });
}

export function textoAvaliacaoGoogle(config: Configuracoes, cliente: string): string {
  return substituirPlaceholders(config.avisoAvaliacaoGoogle || MENSAGEM_AVALIACAO_GOOGLE, {
    cliente,
    link: config.linkAvaliacaoGoogle?.trim() ?? '',
  });
}

export function textoAtraso(config: Configuracoes, cliente: string): string {
  if (config.avisoAtraso) return substituirPlaceholders(config.avisoAtraso, { cliente });
  return MENSAGEM_ATRASO;
}
