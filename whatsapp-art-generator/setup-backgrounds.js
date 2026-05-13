'use strict';

/**
 * Roda UMA VEZ para gerar as 4 fotos de fundo com DALL-E.
 * Custo total: ~$0.16 (4 imagens × $0.04).
 * Depois das fotos salvas, !arte não gasta mais crédito da OpenAI.
 *
 * Como usar:  node setup-backgrounds.js
 */

require('dotenv').config();
const { ensureBackground } = require('./src/backgroundManager');

const TEMPLATES = ['limpa-nome', 'score', 'parcelas', 'rating'];

(async () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY não encontrada no .env');
    process.exit(1);
  }

  console.log('🎨 Gerando fotos de fundo para os 4 templates...');
  console.log('   Isso pode levar ~2 minutos. Aguarde.\n');

  for (const tmpl of TEMPLATES) {
    try {
      const p = await ensureBackground(tmpl);
      console.log(`✅ ${tmpl.padEnd(14)} → ${p}`);
    } catch (err) {
      console.error(`❌ ${tmpl}: ${err.message}`);
    }
  }

  console.log('\n✅ Pronto! Agora o !arte usa as fotos automaticamente.');
})();
