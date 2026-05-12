'use strict';

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { applyLogo } = require('./logoOverlay');

const TEMPLATE_FILE = path.join(__dirname, '..', 'prompts', 'template.txt');

// Prompt padrão se o usuário não tiver personalizado
const DEFAULT_PROMPT =
  'Crie um anúncio publicitário profissional e moderno para o mercado brasileiro. ' +
  'Serviço ou produto: {TEMA}. ' +
  'Exiba o número de WhatsApp {TELEFONE} de forma grande, destacada e bem legível na imagem. ' +
  'Estilo: poster publicitário de alta qualidade, cores vibrantes, design limpo e chamativo, ' +
  'adequado para divulgação em redes sociais. Sem texto extra além do número de contato.';

let _client = null;

function getClient() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada. Adicione no arquivo .env');
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

function buildPrompt(tema, telefone) {
  let template;
  try {
    template = fs.readFileSync(TEMPLATE_FILE, 'utf-8').trim();
  } catch {
    template = process.env.PROMPT_TEMPLATE || DEFAULT_PROMPT;
  }
  return template
    .replace(/{TEMA}/g, tema)
    .replace(/{TELEFONE}/g, telefone);
}

async function generateAdImage(tema, telefone) {
  const prompt = buildPrompt(tema, telefone);
  const quality = process.env.IMAGE_QUALITY === 'hd' ? 'hd' : 'standard';

  console.log(`[IA] Gerando anúncio — tema: "${tema}" | qualidade: ${quality}`);

  const response = await getClient().images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality,
    response_format: 'b64_json',
  });

  // Aplica logo fixo no canto superior esquerdo (mesmo padrão das artes template)
  const raw = Buffer.from(response.data[0].b64_json, 'base64');
  return applyLogo(raw);
}

module.exports = { generateAdImage };
