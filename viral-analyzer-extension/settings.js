document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['openaiKey', 'claudeKey', 'claudeModel'], (data) => {
    if (data.openaiKey) document.getElementById('openaiKey').value = data.openaiKey;
    if (data.claudeKey) document.getElementById('claudeKey').value = data.claudeKey;
    if (data.claudeModel) document.getElementById('claudeModel').value = data.claudeModel;
  });

  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    const openaiKey = document.getElementById('openaiKey').value.trim();
    const claudeKey = document.getElementById('claudeKey').value.trim();
    const claudeModel = document.getElementById('claudeModel').value;
    const msg = document.getElementById('saveMsg');

    if (!openaiKey || !claudeKey) {
      msg.textContent = 'Preencha ambas as chaves de API.';
      msg.className = 'save-msg error';
      return;
    }

    if (!openaiKey.startsWith('sk-')) {
      msg.textContent = 'Chave OpenAI inválida. Deve começar com sk-';
      msg.className = 'save-msg error';
      return;
    }

    if (!claudeKey.startsWith('sk-ant-')) {
      msg.textContent = 'Chave Anthropic inválida. Deve começar com sk-ant-';
      msg.className = 'save-msg error';
      return;
    }

    chrome.storage.sync.set({ openaiKey, claudeKey, claudeModel }, () => {
      msg.textContent = '✅ Configurações salvas com sucesso!';
      msg.className = 'save-msg success';
      setTimeout(() => (msg.textContent = ''), 3000);
    });
  });
});
