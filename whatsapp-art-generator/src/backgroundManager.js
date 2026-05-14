'use strict';

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const BG_DIR = path.join(__dirname, '..', 'assets', 'backgrounds');

// Portrait 1080x1350 — luxury financial aesthetic
const BG_PROMPTS = {
  'limpa-nome': {
    openai: 'Cinematic premium luxury financial advertisement. Professional Brazilian adult man 35-45 years old in expensive tailored black suit, thoughtful worried expression, inside ultra luxury executive office with dark wood paneling or premium bank interior. Deep matte black background with subtle metallic gold rim lighting. Dramatic cinematic shadows, soft gold reflections, strong negative space. Ultra realistic photorealistic rendering, high-end advertising photography quality. No text, no logos, no words.',
    pollinations: 'cinematic premium luxury financial advertisement professional Brazilian adult man 35-45 expensive tailored black suit thoughtful worried expression ultra luxury executive office dark wood paneling deep matte black background subtle metallic gold rim lighting dramatic cinematic shadows soft reflections photorealistic ultra high quality advertising photography no text no logos no words',
    seed: 42,
  },
  'score': {
    openai: 'Cinematic premium luxury financial advertisement. Confident professional Brazilian adult man 35-45 years old in expensive dark premium suit, satisfied pleased expression, reviewing smartphone showing rising credit score graph, premium executive environment with luxury bank interior dark ambiance. Deep matte black background with metallic gold cinematic lighting. Ultra realistic, sophisticated atmosphere, elegant shadows, gold reflections. No text, no logos, no words.',
    pollinations: 'cinematic premium luxury financial advertisement confident professional Brazilian adult man 35-45 expensive dark premium suit satisfied expression reviewing smartphone rising chart luxury executive premium office interior dark matte black background metallic gold cinematic lighting ultra realistic sophisticated elegant shadows no text no logos no words',
    seed: 123,
  },
  'parcelas': {
    openai: 'Cinematic premium luxury financial advertisement. Relieved satisfied professional Brazilian adult 35-45 years old in elegant premium dark business attire, calm confident expression, reviewing financial documents at luxury mahogany executive desk, premium executive office or luxury private banking environment. Deep matte black background with warm cinematic gold lighting and elegant shadows. Ultra realistic, sophisticated. No text, no logos, no words.',
    pollinations: 'cinematic premium luxury financial advertisement relieved satisfied professional Brazilian adult 35-45 elegant premium dark suit reviewing financial documents luxury mahogany executive desk premium private banking office deep matte black background warm cinematic gold lighting elegant shadows ultra realistic sophisticated no text no logos no words',
    seed: 456,
  },
  'rating': {
    openai: 'Cinematic premium luxury financial advertisement. Powerful authoritative Brazilian executive 40-50 years old in premium tailored black suit, confident commanding expression, ultra luxury private bank boardroom or exclusive executive suite with dark interior and gold accents. Deep matte black background with dramatic cinematic gold accent lighting and elegant shadows. Photorealistic, ultra high quality. No text, no logos, no words.',
    pollinations: 'cinematic premium luxury financial advertisement powerful authoritative Brazilian executive 40-50 premium tailored black suit confident commanding expression ultra luxury private bank boardroom exclusive executive suite dark interior gold accents deep matte black background dramatic cinematic gold lighting photorealistic ultra high quality no text no logos no words',
    seed: 789,
  },
};

async function generateWithOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');

  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey });

  console.log('[Background] Gerando com OpenAI gpt-image-1 (portrait)...');
  const response = await client.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x1536',
  });

  const b64 = response.data[0].b64_json;
  if (!b64) throw new Error('OpenAI não retornou imagem base64');
  console.log('[Background] Imagem OpenAI recebida com sucesso');
  return Buffer.from(b64, 'base64');
}

async function generateWithPollinations(prompt, seed) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1350&model=flux-realism&nologo=true&seed=${seed}`;
  console.log('[Background] Conectando ao Pollinations.ai (1080x1350)...');
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Pollinations retornou ${response.status}`);
  const buf = Buffer.from(await response.arrayBuffer());
  console.log(`[Background] Pollinations: ${(buf.length / 1024).toFixed(0)}KB recebidos`);
  return buf;
}

async function ensureBackground(templateKey) {
  fs.mkdirSync(BG_DIR, { recursive: true });

  const bgPath = path.join(BG_DIR, `${templateKey}.jpg`);
  if (fs.existsSync(bgPath)) return bgPath;

  const cfg = BG_PROMPTS[templateKey];
  if (!cfg) return null;

  console.log(`[Background] Gerando fundo premium "${templateKey}"... (pode levar ~30-60s)`);

  let buf;
  if (process.env.OPENAI_API_KEY) {
    try {
      buf = await generateWithOpenAI(cfg.openai);
    } catch (err) {
      console.warn(`[Background] OpenAI falhou (${err.message}), usando Pollinations...`);
      buf = await generateWithPollinations(cfg.pollinations, cfg.seed);
    }
  } else {
    buf = await generateWithPollinations(cfg.pollinations, cfg.seed);
  }

  await sharp(buf).resize(1080, 1350, { fit: 'cover' }).jpeg({ quality: 92 }).toFile(bgPath);
  console.log(`[Background] Salvo em ${bgPath}`);
  return bgPath;
}

async function generateCustomBackground(tema) {
  const openaiPrompt = `Cinematic premium luxury financial advertisement background. Professional Brazilian adult 35-45 years old in expensive dark suit, inside ultra luxury executive office or premium financial environment. Deep matte black background with metallic gold accent cinematic lighting. Theme: ${tema}. Dramatic shadows, elegant gold reflections, strong negative space. Photorealistic, ultra high quality advertising photography. No text, no logos, no words.`;
  const pollinationsPrompt = `cinematic premium luxury financial advertisement professional Brazilian adult 35-45 expensive dark suit ultra luxury executive office deep matte black background metallic gold accent cinematic lighting theme ${tema} dramatic shadows elegant gold reflections photorealistic ultra high quality no text no logos no words`;

  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateWithOpenAI(openaiPrompt);
    } catch (err) {
      console.warn(`[Background] OpenAI falhou (${err.message}), usando Pollinations...`);
    }
  }

  const seed = Math.floor(Math.random() * 9999);
  return generateWithPollinations(pollinationsPrompt, seed);
}

module.exports = { ensureBackground, generateCustomBackground };
