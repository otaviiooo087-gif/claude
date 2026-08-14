const messagesEl = document.getElementById('messages');
const formEl = document.getElementById('chat-form');
const inputEl = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const errorEl = document.getElementById('chat-error');
const conversationListEl = document.getElementById('conversation-list');
const newChatBtn = document.getElementById('new-chat-btn');

const CHATS_KEY = 'art-generator-chats';
const SYSTEM_PROMPT = { role: 'system', content: 'Você é um assistente útil, respondendo em português do Brasil por padrão.' };

let chats = loadChats();
let currentChatId = chats[0]?.id ?? null;

function loadChats() {
  try {
    const data = JSON.parse(localStorage.getItem(CHATS_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveChats() {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

function getCurrentChat() {
  return chats.find((c) => c.id === currentChatId) ?? null;
}

function createChat() {
  const chat = { id: crypto.randomUUID(), title: 'Nova conversa', messages: [] };
  chats.unshift(chat);
  currentChatId = chat.id;
  saveChats();
  renderConversationList();
  renderMessages();
  inputEl.focus();
}

function deleteChat(id) {
  chats = chats.filter((c) => c.id !== id);
  if (currentChatId === id) {
    currentChatId = chats[0]?.id ?? null;
  }
  saveChats();
  renderConversationList();
  renderMessages();
}

function selectChat(id) {
  currentChatId = id;
  renderConversationList();
  renderMessages();
}

function renderConversationList() {
  conversationListEl.innerHTML = '';
  chats.forEach((chat) => {
    const item = document.createElement('div');
    item.className = 'conversation-item' + (chat.id === currentChatId ? ' active' : '');

    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = chat.title;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '✕';
    deleteBtn.title = 'Excluir conversa';
    deleteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteChat(chat.id);
    });

    item.append(title, deleteBtn);
    item.addEventListener('click', () => selectChat(chat.id));
    conversationListEl.appendChild(item);
  });
}

function renderMessages() {
  messagesEl.innerHTML = '';
  const chat = getCurrentChat();

  if (!chat || chat.messages.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<h1>Como posso ajudar?</h1><p>Digite uma mensagem abaixo para começar a conversar.</p>';
    messagesEl.appendChild(empty);
    return;
  }

  chat.messages.forEach((msg) => appendMessageRow(msg.role, msg.content));
  scrollToBottom();
}

function appendMessageRow(role, content) {
  const row = document.createElement('div');
  row.className = `message-row ${role}`;

  const inner = document.createElement('div');
  inner.className = 'message-row__inner';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = role === 'user' ? '🧑' : '🤖';

  const contentEl = document.createElement('div');
  contentEl.className = 'message-content';
  contentEl.textContent = content;

  inner.append(avatar, contentEl);
  row.appendChild(inner);
  messagesEl.appendChild(row);
  return contentEl;
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

function autoResize() {
  inputEl.style.height = 'auto';
  inputEl.style.height = `${Math.min(inputEl.scrollHeight, 200)}px`;
}

inputEl.addEventListener('input', autoResize);

inputEl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    formEl.requestSubmit();
  }
});

newChatBtn.addEventListener('click', () => createChat());

formEl.addEventListener('submit', async (event) => {
  event.preventDefault();
  showError('');

  const text = inputEl.value.trim();
  if (!text) return;

  if (!getCurrentChat()) {
    createChat();
  }
  const chat = getCurrentChat();

  if (chat.messages.length === 0) {
    chat.title = text.slice(0, 40) + (text.length > 40 ? '…' : '');
  }
  chat.messages.push({ role: 'user', content: text });
  saveChats();
  renderConversationList();
  renderMessages();

  inputEl.value = '';
  autoResize();
  sendBtn.disabled = true;

  const assistantContentEl = appendMessageRow('assistant', '');
  assistantContentEl.innerHTML = '<span class="cursor"></span>';
  scrollToBottom();

  let assistantText = '';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [SYSTEM_PROMPT, ...chat.messages] }),
    });

    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Não foi possível conversar com a IA.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split('\n\n');
      buffer = parts.pop();

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;

        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            assistantText += delta;
            assistantContentEl.textContent = assistantText;
            assistantContentEl.innerHTML += '<span class="cursor"></span>';
            scrollToBottom();
          }
        } catch {
          // ignora fragmentos incompletos
        }
      }
    }

    assistantContentEl.textContent = assistantText || '(sem resposta)';
    chat.messages.push({ role: 'assistant', content: assistantText });
    saveChats();
  } catch (err) {
    assistantContentEl.textContent = '';
    showError(err.message);
    chat.messages.pop();
    saveChats();
    renderMessages();
  } finally {
    sendBtn.disabled = false;
  }
});

if (chats.length === 0) {
  createChat();
} else {
  renderConversationList();
  renderMessages();
}
