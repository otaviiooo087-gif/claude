import OpenAI from 'openai';
import { config } from './config.js';
import { getHistory } from './store.js';

// Cliente só é criado se houver chave — assim o app roda em modo demo sem a API.
let client = null;
if (config.openaiApiKey) {
  client = new OpenAI({ apiKey: config.openaiApiKey });
} else {
  console.warn(
    '[ai] OPENAI_API_KEY ausente — usando respostas de fallback. ' +
      'Defina a chave no .env para ativar as respostas com IA.',
  );
}

const FALLBACKS = [
  'Oi! 👋 No momento estou em modo de demonstração, mas já já te respondo de verdade!',
  'Recebi sua mensagem! 🙂 (configure a OPENAI_API_KEY para ativar a IA)',
  'Tô aqui! Assim que a chave da API estiver configurada, respondo com tudo. 🚀',
  'Mensagem recebida! 📩 Modo demo ativo no momento.',
  'Opa! Anotado por aqui. 😄',
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function aiAvailable() {
  return Boolean(client);
}

// Gera a resposta usando o histórico da conversa como contexto (memória por contato).
export async function generateReply(conversationId) {
  if (!client) return pick(FALLBACKS);

  const history = getHistory(conversationId, config.historyLimit);
  const messages = history.map((m) => ({
    role: m.dir === 'in' ? 'user' : 'assistant',
    content: m.text,
  }));

  // A conversa precisa começar com uma mensagem do usuário.
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (messages.length === 0) messages.push({ role: 'user', content: 'Olá' });

  try {
    const res = await client.chat.completions.create({
      model: config.model,
      max_completion_tokens: 1024,
      messages: [{ role: 'system', content: config.systemPrompt }, ...messages],
    });
    const text = (res.choices[0]?.message?.content || '').trim();
    return text || '🙂';
  } catch (err) {
    console.error('[ai] erro ao gerar resposta:', err.message);
    return 'Ops, tive um probleminha para responder agora. Pode repetir? 🙏';
  }
}
