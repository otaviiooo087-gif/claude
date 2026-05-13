'use strict';

/**
 * Gera e armazena as fotos de fundo de cada template usando DALL-E.
 * As fotos são geradas UMA VEZ e salvas em assets/backgrounds/.
 * Nas próximas chamadas, usa o arquivo salvo (sem custo adicional).
 */

const sharp  = require('sharp');
const OpenAI = require('openai');
const fs     = require('fs');
const path   = require('path');

const BG_DIR = path.join(__dirname, '..', 'assets', 'backgrounds');

const BG_PROMPTS = {
  'limpa-nome':
    'Professional Brazilian man in his 30s, business casual clothes, smiling while holding a smartphone showing "APPROVED" on screen, luxury car dealership in background, very dark background with dramatic gold lighting, photorealistic high quality advertising photography, cinematic lighting, premium mood',

  'score':
    'Confident professional Brazilian businessman in dark suit, working with laptop and smartphone, dark modern office background, subtle gold accent lighting, focused expression, photorealistic corporate advertising photography, premium atmosphere',

  'parcelas':
    'Brazilian professional couple looking happy and relieved, holding documents and smartphone, dark modern apartment background, warm subtle lighting, photorealistic lifestyle advertising photography, aspirational mood',

  'rating':
    'Confident professional Brazilian man in premium suit, holding smartphone, dark luxury background with subtle gold accents, bank or corporate building blurred behind, photorealistic executive advertising photography, powerful atmosphere',
};

let _client = null;
function getClient() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

async function ensureBackground(templateKey) {
  fs.mkdirSync(BG_DIR, { recursive: true });

  const bgPath = path.join(BG_DIR, `${templateKey}.jpg`);
  if (fs.existsSync(bgPath)) return bgPath; // já existe — usa direto

  if (!process.env.OPENAI_API_KEY) return null;

  console.log(`[Background] Gerando fundo "${templateKey}" com IA... (1x, ~20s)`);

  const response = await getClient().images.generate({
    model:           'dall-e-3',
    prompt:          BG_PROMPTS[templateKey],
    n:               1,
    size:            '1024x1024',
    quality:         'standard',
    response_format: 'b64_json',
  });

  const buf = Buffer.from(response.data[0].b64_json, 'base64');
  await sharp(buf).jpeg({ quality: 92 }).toFile(bgPath);
  console.log(`[Background] Salvo em ${bgPath}`);

  return bgPath;
}

module.exports = { ensureBackground };
