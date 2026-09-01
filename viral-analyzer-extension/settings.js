document.addEventListener('DOMContentLoaded', () => {
  const providerSelect = document.getElementById('aiProvider');
  const anthropicFields = document.getElementById('anthropicFields');
  const openrouterFields = document.getElementById('openrouterFields');

  function toggleProviderFields() {
    const isOpenRouter = providerSelect.value === 'openrouter';
    anthropicFields.style.display = isOpenRouter ? 'none' : 'block';
    openrouterFields.style.display = isOpenRouter ? 'block' : 'none';
  }

  chrome.storage.sync.get(
    ['openaiKey', 'claudeKey', 'claudeModel', 'aiProvider', 'openrouterKey', 'openrouterModel'],
    (data) => {
      if (data.openaiKey) document.getElementById('openaiKey').value = data.openaiKey;
      if (data.claudeKey) document.getElementById('claudeKey').value = data.claudeKey;
      if (data.claudeModel) document.getElementById('claudeModel').value = data.claudeModel;
      if (data.openrouterKey) document.getElementById('openrouterKey').value = data.openrouterKey;
      document.getElementById('openrouterModel').value = data.openrouterModel || 'openrouter/free';
      providerSelect.value = data.aiProvider || 'anthropic';
      toggleProviderFields();
    }
  );

  providerSelect.addEventListener('change', toggleProviderFields);

  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    const openaiKey = document.getElementById('openaiKey').value.trim();
    const aiProvider = providerSelect.value;
    const claudeKey = document.getElementById('claudeKey').value.trim();
    const claudeModel = document.getElementById('claudeModel').value;
    const openrouterKey = document.getElementById('openrouterKey').value.trim();
    const openrouterModel = document.getElementById('openrouterModel').value.trim() || 'openrouter/free';
    const msg = document.getElementById('saveMsg');

    if (!openaiKey) {
      msg.textContent = 'Preencha a chave da OpenAI (usada na transcrição).';
      msg.className = 'save-msg error';
      return;
    }

    if (!openaiKey.startsWith('sk-')) {
      msg.textContent = 'Chave OpenAI inválida. Deve começar com sk-';
      msg.className = 'save-msg error';
      return;
    }

    if (aiProvider === 'anthropic') {
      if (!claudeKey) {
        msg.textContent = 'Preencha a chave da Anthropic.';
        msg.className = 'save-msg error';
        return;
      }
      if (!claudeKey.startsWith('sk-ant-')) {
        msg.textContent = 'Chave Anthropic inválida. Deve começar com sk-ant-';
        msg.className = 'save-msg error';
        return;
      }
    } else {
      if (!openrouterKey) {
        msg.textContent = 'Preencha a chave do OpenRouter.';
        msg.className = 'save-msg error';
        return;
      }
      if (!openrouterKey.startsWith('sk-or-')) {
        msg.textContent = 'Chave OpenRouter inválida. Deve começar com sk-or-';
        msg.className = 'save-msg error';
        return;
      }
    }

    chrome.storage.sync.set(
      { openaiKey, claudeKey, claudeModel, aiProvider, openrouterKey, openrouterModel },
      () => {
        msg.textContent = '✅ Configurações salvas com sucesso!';
        msg.className = 'save-msg success';
        setTimeout(() => (msg.textContent = ''), 3000);
      }
    );
  });
});
