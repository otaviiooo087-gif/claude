'use strict';

const TEMPLATES = {
  'limpa-nome': {
    headlineLines:    ['NOME', 'SUJO?'],
    headlineFontSize: 132,
    subtitle: [
      'Volte a ter acesso a crédito,',
      'cartão e financiamento.',
    ],
    cta:      'Chame agora e resolva',
    category: 'CONSULTORIA FINANCEIRA',
  },

  'score': {
    headlineLines:    ['SCORE NÃO', 'SOBE POR', 'ACASO.'],
    headlineFontSize: 92,
    subtitle: [
      'É resultado de estratégia.',
    ],
    cta:      'Me chama agora',
    category: 'SCORE DE CRÉDITO',
  },

  'parcelas': {
    headlineLines:    ['PARCELAS', 'PESANDO', 'NO BOLSO?'],
    headlineFontSize: 92,
    subtitle: [
      'Reduza o valor e pague',
      'menos todo mês.',
    ],
    cta:      'Chame agora e resolva',
    category: 'FINANCIAMENTO',
  },

  'rating': {
    headlineLines:    ['AUMENTE SEU', 'RATING', 'BANCÁRIO.'],
    headlineFontSize: 92,
    subtitle: [
      'Melhore seu relacionamento',
      'com os bancos.',
    ],
    cta:      'Fale com nossa equipe',
    category: 'RATING BANCÁRIO',
  },
};

const SERVICE_ALIASES = {
  'limpa-nome': [
    'limpa nome', 'limpanome', 'limpar nome', 'limpa-nome',
    'nome sujo', 'nome negativado', 'negativado',
  ],
  'score': [
    'score', 'aumento de score', 'aumentar score', 'aumento score',
    'aumentar o score', 'aumento do score',
  ],
  'parcelas': [
    'parcelas', 'reducao de parcelas', 'redução de parcelas',
    'financiamento', 'reduzir parcelas', 'redução', 'parcelamento',
  ],
  'rating': [
    'rating', 'aumento de rating', 'rating bancario', 'rating bancário',
    'aumentar rating', 'aumento de rating bancario',
  ],
};

module.exports = { TEMPLATES, SERVICE_ALIASES };
