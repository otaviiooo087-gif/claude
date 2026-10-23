import { upsertConversation, addMessage, getState } from './store.js';
import { generateReply } from './ai.js';
import { computeStats } from './stats.js';
import { colorFor, initials, newId } from './util.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// O "motor" central: recebe uma mensagem (do WhatsApp OU do demo), persiste,
// transmite tudo via Socket.io, pede a resposta à IA e devolve.
// `wa` (opcional) expõe sendText/sendPresence para o WhatsApp real.
export function createEngine({ io, wa }) {
  const emitStats = () => io.emit('stats', computeStats());

  function ensureConversation(id, name) {
    const existing = getState().conversations[id];
    if (existing) return existing;
    const label = name || id.split('@')[0];
    const conv = upsertConversation({
      id,
      name: label,
      color: colorFor(id),
      avatarText: initials(label),
      count: 0,
      unread: 0,
      lastText: '',
      lastTs: Date.now(),
      createdTs: Date.now(),
    });
    io.emit('conversation', conv);
    return conv;
  }

  async function handleInbound({ conversationId, name, text, isDemo = false }) {
    const clean = (text || '').trim();
    if (!clean) return;

    ensureConversation(conversationId, name);

    // 1) Mensagem recebida
    const inMsg = { id: newId('in'), dir: 'in', text: clean, ts: Date.now() };
    addMessage(conversationId, inMsg);
    const conv1 = upsertConversation({
      id: conversationId,
      lastText: inMsg.text,
      lastTs: inMsg.ts,
      count: getState().messages[conversationId].length,
      unread: (getState().conversations[conversationId].unread || 0) + 1,
    });
    io.emit('message', { conversationId, message: inMsg });
    io.emit('conversation', conv1);
    emitStats();

    // 2) "digitando…"
    io.emit('typing', { conversationId, on: true });
    if (!isDemo) wa?.sendPresence?.(conversationId, 'composing');

    // 3) Resposta da IA (usa o histórico como contexto)
    const reply = await generateReply(conversationId);

    // 4) Pequeno atraso proporcional ao tamanho — deixa o "digitando…" visível
    await sleep(Math.min(3500, 700 + reply.length * 30));

    // 5) Mensagem enviada
    const outMsg = { id: newId('out'), dir: 'out', text: reply, ts: Date.now() };
    addMessage(conversationId, outMsg);
    const conv2 = upsertConversation({
      id: conversationId,
      lastText: outMsg.text,
      lastTs: outMsg.ts,
      count: getState().messages[conversationId].length,
    });

    io.emit('typing', { conversationId, on: false });
    io.emit('message', { conversationId, message: outMsg });
    io.emit('conversation', conv2);
    emitStats();

    // 6) Envia de verdade no WhatsApp (quando não é demo)
    if (!isDemo) {
      try {
        await wa?.sendPresence?.(conversationId, 'paused');
        await wa?.sendText?.(conversationId, reply);
      } catch (err) {
        console.error('[engine] erro ao enviar no WhatsApp:', err.message);
      }
    }
  }

  return { handleInbound };
}
