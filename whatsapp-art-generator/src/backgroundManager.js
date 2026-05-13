'use strict';

/**
 * Gera fotos de fundo usando Pollinations.ai — GRATUITO, sem API key.
 * As fotos são geradas UMA VEZ e salvas em assets/backgrounds/.
 * Nas próximas chamadas usa o arquivo salvo (sem custo e sem espera).
 */

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const BG_DIR = path.join(__dirname, '..', 'assets', 'backgrounds');

const BG_PROMPTS = {
  'limpa-nome': {
    prompt: 'professional Brazilian man 30s business casual smiling holding smartphone showing approved screen, luxury car dealership dark background dramatic gold lighting, photorealistic advertising photography, cinematic premium mood',
    seed: 42,
  },
  'score': {
    prompt: 'confident professional Brazilian businessman dark suit laptop smartphone dark modern office background subtle gold accent lighting focused expression, photorealistic corporate advertising photography premium atmosphere',
    seed: 123,
  },
  'parcelas': {
    prompt: 'Brazilian professional man happy relieved holding documents smartphone dark modern apartment background warm subtle lighting, photorealistic lifestyle advertising photography aspirational mood',
    seed: 456,
  },
  'rating': {
    prompt: 'confident professional Brazilian man premium suit holding smartphone dark luxury background subtle gold accents bank corporate building blurred, photorealistic executive advertising photography powerful atmosphere',
    seed: 789,
  },
};

async function generateWithPollinations(prompt, seed) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux-realism&nologo=true&seed=${seed}`;
  console.log(`[Background] Conectando ao Pollinations.ai...`);

  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Pollinations retornou ${response.status}`);

  const buf = Buffer.from(await response.arrayBuffer());
  console.log(`[Background] Imagem recebida (${(buf.length / 1024).toFixed(0)}KB)`);
  return buf;
}

async function ensureBackground(templateKey) {
  fs.mkdirSync(BG_DIR, { recursive: true });

  const bgPath = path.join(BG_DIR, `${templateKey}.jpg`);
  if (fs.existsSync(bgPath)) return bgPath;

  const cfg = BG_PROMPTS[templateKey];
  if (!cfg) return null;

  console.log(`[Background] Gerando fundo "${templateKey}" com IA gratuita... (~30s)`);

  const buf = await generateWithPollinations(cfg.prompt, cfg.seed);
  await sharp(buf).resize(1024, 1024, { fit: 'cover' }).jpeg({ quality: 92 }).toFile(bgPath);
  console.log(`[Background] Salvo em ${bgPath}`);

  return bgPath;
}

/**
 * Gera fundo personalizado para o !anuncio, baseado no tema do vendedor.
 * Retorna um Buffer PNG (não salva em disco — cada anúncio é único).
 */
async function generateCustomBackground(tema) {
  const prompt = `professional Brazilian financial services advertisement background, dark luxury setting, subtle gold lighting, person holding smartphone, theme: ${tema}, photorealistic, high quality, dark mood, no text, no words`;
  const seed   = Math.floor(Math.random() * 9999);
  return generateWithPollinations(prompt, seed);
}

module.exports = { ensureBackground, generateCustomBackground };
