'use strict';

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const BG_DIR = path.join(__dirname, '..', 'assets', 'backgrounds');

const BG_PROMPTS = {
  'limpa-nome': {
    openai: 'Professional Brazilian financial advertising photo. A stressed worried man in dark suit holding a declined credit card, looking at camera. Dark dramatic background with subtle gold rim lighting. Photorealistic, cinematic, high quality. No text, no words.',
    pollinations: 'stressed worried Brazilian man 30s dark suit holding declined credit card looking at camera, dark dramatic studio background subtle gold rim light, photorealistic advertising photography cinematic, no text no words',
    seed: 42,
  },
  'score': {
    openai: 'Professional Brazilian businessman in dark suit, confident expression, holding smartphone showing rising credit score graph, dark modern office background with gold lighting accents. Photorealistic advertising photography. No text, no words.',
    pollinations: 'confident professional Brazilian businessman dark suit holding smartphone credit score chart rising dark modern office background dramatic gold accent lighting focused expression, photorealistic advertising photography, no text no words',
    seed: 123,
  },
  'parcelas': {
    openai: 'Happy relieved Brazilian professional man holding financial documents and smiling, dark modern home background, warm professional lighting. Photorealistic lifestyle advertising photography. No text, no words.',
    pollinations: 'relieved happy Brazilian professional man holding documents smiling dark modern apartment background warm lighting, photorealistic lifestyle advertising photography, no text no words',
    seed: 456,
  },
  'rating': {
    openai: 'Powerful Brazilian executive in premium dark suit, luxury bank interior background with subtle gold accents, confident authoritative expression. Photorealistic advertising photography. No text, no words.',
    pollinations: 'powerful Brazilian executive premium suit dark luxury bank interior background subtle gold accents confident expression, photorealistic executive advertising photography, no text no words',
    seed: 789,
  },
};

async function generateWithOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');

  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey });

  console.log('[Background] Gerando com OpenAI gpt-image-1...');
  const response = await client.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x1024',
  });

  const b64 = response.data[0].b64_json;
  if (!b64) throw new Error('OpenAI não retornou imagem base64');
  console.log('[Background] Imagem OpenAI recebida com sucesso');
  return Buffer.from(b64, 'base64');
}

async function generateWithPollinations(prompt, seed) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux-realism&nologo=true&seed=${seed}`;
  console.log('[Background] Conectando ao Pollinations.ai...');
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

  console.log(`[Background] Gerando fundo "${templateKey}"... (pode levar ~30-60s)`);

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

  await sharp(buf).resize(1024, 1024, { fit: 'cover' }).jpeg({ quality: 92 }).toFile(bgPath);
  console.log(`[Background] Salvo em ${bgPath}`);
  return bgPath;
}

async function generateCustomBackground(tema) {
  const openaiPrompt = `Professional Brazilian financial services advertisement background. Dark luxury setting, subtle gold lighting, person holding smartphone. Theme: ${tema}. Photorealistic, cinematic, dark mood. No text, no words.`;
  const pollinationsPrompt = `professional Brazilian financial services advertisement background dark luxury setting subtle gold lighting person holding smartphone theme ${tema} photorealistic high quality dark mood no text no words`;

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
