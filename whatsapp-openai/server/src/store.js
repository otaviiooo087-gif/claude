import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// Persistência simples em arquivo JSON (server/data/store.json).
const DATA_FILE = fileURLToPath(new URL('../data/store.json', import.meta.url));

const state = {
  conversations: {}, // id -> { id, name, color, avatarText, count, unread, lastText, lastTs, createdTs }
  messages: {},      // id -> [ { id, dir: 'in'|'out', text, ts } ]
};

let saveTimer = null;

export function loadStore() {
  try {
    if (existsSync(DATA_FILE)) {
      const raw = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
      state.conversations = raw.conversations || {};
      state.messages = raw.messages || {};
    }
  } catch (err) {
    console.error('[store] falha ao carregar, começando vazio:', err.message);
  }
  return state;
}

function persist() {
  try {
    mkdirSync(dirname(DATA_FILE), { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('[store] falha ao salvar:', err.message);
  }
}

// Escrita "debounced" para não gravar no disco a cada mensagem.
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 500);
}

export function getState() {
  return state;
}

export function upsertConversation(partial) {
  const existing = state.conversations[partial.id] || {};
  state.conversations[partial.id] = { ...existing, ...partial };
  scheduleSave();
  return state.conversations[partial.id];
}

export function addMessage(conversationId, message) {
  if (!state.messages[conversationId]) state.messages[conversationId] = [];
  state.messages[conversationId].push(message);
  scheduleSave();
  return message;
}

export function getHistory(conversationId, limit = Infinity) {
  const all = state.messages[conversationId] || [];
  return limit === Infinity ? all : all.slice(-limit);
}
