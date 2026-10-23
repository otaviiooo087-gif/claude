import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Carrega o .env da raiz do projeto (um nível acima de /server), seja qual for o cwd.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
// Também tenta um server/.env local (não sobrescreve o que já existe).
dotenv.config();

const botName = process.env.BOT_NAME || 'Bot';

function defaultSystemPrompt() {
  return [
    `Você é ${botName}, um assistente simpático que conversa pelo WhatsApp em português do Brasil.`,
    'Responda de forma natural, calorosa e CONCISA — como uma pessoa digitando no celular.',
    'Use no máximo 2 ou 3 frases curtas. Emojis com moderação, quando fizer sentido. 🙂',
    'Se não souber algo, seja honesto e nunca invente informações.',
  ].join(' ');
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  botName,
  whatsappEnabled: (process.env.WHATSAPP_ENABLED ?? 'true').toLowerCase() !== 'false',
  systemPrompt: process.env.BOT_SYSTEM_PROMPT || defaultSystemPrompt(),
  historyLimit: 20, // nº de mensagens passadas enviadas como contexto para a IA
};
