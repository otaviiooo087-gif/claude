'use strict';

const TEMPLATES = {
  'limpa-nome': {
    headlineLines:    ['O NOME SUJO', 'CUSTA MAIS', 'DO QUE VOCÊ', 'IMAGINA'],
    headlineFontSize: 84,
    subtitle: [
      'Financiamentos, cartões e crédito',
      'podem ser afetados.',
    ],
    cta:      'Chame agora e resolva',
    category: 'CONSULTORIA FINANCEIRA',
    icons: [
      { type: 'lock',       labels: ['CRÉDITO',       'BLOQUEADO']        },
      { type: 'chart-down', labels: ['DIFICULDADE EM', 'FINANCIAMENTOS']   },
      { type: 'card',       labels: ['CARTÕES COM',    'LIMITES BAIXOS']   },
      { type: 'percent',    labels: ['JUROS MAIS',     'ALTOS']            },
    ],
  },

  'score': {
    headlineLines:    ['SCORE NÃO', 'SOBE POR', 'ACASO.'],
    headlineFontSize: 92,
    subtitle: [
      'É resultado de estratégia',
      'e conhecimento financeiro.',
    ],
    cta:      'Me chama agora',
    category: 'SCORE DE CRÉDITO',
    icons: [
      { type: 'arrow-up', labels: ['SCORE',         'AUMENTADO']    },
      { type: 'check',    labels: ['APROVAÇÃO',     'FACILITADA']   },
      { type: 'card',     labels: ['MAIS',          'CRÉDITO']      },
      { type: 'bank',     labels: ['FINANCIAMENTO', 'LIBERADO']     },
    ],
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
    icons: [
      { type: 'money',    labels: ['MENOS POR',  'MÊS']          },
      { type: 'calendar', labels: ['PRAZO',       'MAIOR']        },
      { type: 'percent',  labels: ['TAXA',        'MENOR']        },
      { type: 'check',    labels: ['ALÍVIO',      'FINANCEIRO']   },
    ],
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
    icons: [
      { type: 'star',     labels: ['RATING',      'AUMENTADO']    },
      { type: 'bank',     labels: ['CRÉDITO',      'BANCÁRIO']     },
      { type: 'check',    labels: ['APROVAÇÃO',    'RÁPIDA']       },
      { type: 'arrow-up', labels: ['CRESCIMENTO',  'FINANCEIRO']   },
    ],
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
