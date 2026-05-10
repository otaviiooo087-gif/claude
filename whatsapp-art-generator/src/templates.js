'use strict';

const TEMPLATES = {
  'limpa-nome': {
    gradient: { from: '#B91C1C', to: '#DC2626' },
    glowColor: 'rgba(252,165,165,0.15)',
    accent: '#FCA5A5',
    iconPath: `
      <circle cx="540" cy="280" r="110" fill="rgba(255,255,255,0.12)"/>
      <circle cx="540" cy="280" r="88" fill="rgba(255,255,255,0.08)"/>
      <polyline points="476,278 520,325 616,230"
        stroke="white" stroke-width="20" fill="none"
        stroke-linecap="round" stroke-linejoin="round"/>
    `,
    line1: 'LIMPA',
    line2: 'NOME',
    subtitle: 'Quite suas dívidas e limpe seu nome!',
    category: 'SERVIÇO FINANCEIRO',
  },

  'score': {
    gradient: { from: '#14532D', to: '#16A34A' },
    glowColor: 'rgba(134,239,172,0.15)',
    accent: '#86EFAC',
    iconPath: `
      <circle cx="540" cy="280" r="110" fill="rgba(255,255,255,0.12)"/>
      <circle cx="540" cy="280" r="88" fill="rgba(255,255,255,0.08)"/>
      <polygon points="540,190 615,295 580,295 580,375 500,375 500,295 465,295"
        fill="white"/>
    `,
    line1: 'AUMENTO',
    line2: 'DE SCORE',
    subtitle: 'Eleve seu score e conquiste mais crédito!',
    category: 'SCORE DE CRÉDITO',
  },

  'parcelas': {
    gradient: { from: '#1E3A5F', to: '#1D4ED8' },
    glowColor: 'rgba(147,197,253,0.15)',
    accent: '#93C5FD',
    iconPath: `
      <circle cx="540" cy="280" r="110" fill="rgba(255,255,255,0.12)"/>
      <circle cx="540" cy="280" r="88" fill="rgba(255,255,255,0.08)"/>
      <text x="540" y="322" text-anchor="middle"
        font-family="Arial Black, Arial, sans-serif"
        font-size="96" font-weight="900" fill="white">%</text>
    `,
    line1: 'REDUÇÃO DE',
    line2: 'PARCELAS',
    subtitle: 'Reduza o valor das suas parcelas!',
    category: 'FINANCIAMENTO',
  },

  'rating': {
    gradient: { from: '#3B0764', to: '#7C3AED' },
    glowColor: 'rgba(196,181,253,0.15)',
    accent: '#C4B5FD',
    iconPath: `
      <circle cx="540" cy="280" r="110" fill="rgba(255,255,255,0.12)"/>
      <circle cx="540" cy="280" r="88" fill="rgba(255,255,255,0.08)"/>
      <polygon points="540,195 562,258 630,258 576,298 596,361 540,322 484,361 504,298 450,258 518,258"
        fill="white"/>
    `,
    line1: 'RATING',
    line2: 'BANCÁRIO',
    subtitle: 'Melhore seu relacionamento com o banco!',
    category: 'RATING BANCÁRIO',
  },
};

const SERVICE_ALIASES = {
  'limpa-nome': [
    'limpa nome', 'limpanome', 'limpar nome', 'limpa-nome', 'limpar o nome',
    'limpa o nome',
  ],
  'score': [
    'score', 'aumento de score', 'aumentar score', 'aumento score',
    'aumentar o score', 'aumento do score',
  ],
  'parcelas': [
    'parcelas', 'reducao de parcelas', 'redução de parcelas', 'reducao',
    'financiamento', 'reduzir parcelas', 'redução', 'reducao de parcela',
    'redução de parcela', 'parcelamento',
  ],
  'rating': [
    'rating', 'aumento de rating', 'rating bancario', 'rating bancário',
    'aumentar rating', 'aumento de rating bancario', 'aumento de rating bancário',
  ],
};

module.exports = { TEMPLATES, SERVICE_ALIASES };
