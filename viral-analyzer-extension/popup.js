const CLAUDE_SYSTEM_PROMPT = `Você é um especialista em copywriting, análise de vídeos virais e engenharia reversa de conteúdo persuasivo.

Dado uma transcrição de vídeo, responda SEMPRE em JSON com esta estrutura exata:

{
  "raiox": {
    "gancho": "descrição do gancho inicial (primeiros 3s)",
    "promessa": "a promessa principal do vídeo",
    "dor": "a dor explorada",
    "desejo": "o desejo ativado",
    "prova": "prova ou autoridade usada",
    "estrutura": "estrutura identificada (AIDA, PAS, storytelling etc)",
    "padroes_emocionais": ["urgência", "medo", "status", "ganho", etc],
    "cta": "call to action explícito ou implícito"
  },
  "engenharia_reversa": {
    "por_que_prende": "análise direta do que prende atenção",
    "onde_perde": "onde o vídeo perde atenção",
    "melhorias": "o que pode ser melhorado",
    "replicavel": "partes replicáveis",
    "descartavel": "partes descartáveis"
  },
  "roteiros": [
    {
      "nome": "Nome da estratégia",
      "gancho": "texto do gancho (máx 2 frases curtas)",
      "desenvolvimento": "desenvolvimento (4-6 frases curtas)",
      "climax": "clímax/virada (2-3 frases)",
      "cta": "call to action forte"
    }
  ],
  "extras": {
    "variacoes_gancho": {
      "roteiro1": ["variação 1", "variação 2", "variação 3"],
      "roteiro2": ["variação 1", "variação 2", "variação 3"],
      "roteiro3": ["variação 1", "variação 2", "variação 3"],
      "roteiro4": ["variação 1", "variação 2", "variação 3"],
      "roteiro5": ["variação 1", "variação 2", "variação 3"]
    },
    "titulos": ["título 1", "título 2", "título 3"],
    "cenario_linguagem": "sugestão de cenário e linguagem corporal"
  }
}

Crie exatamente 5 roteiros. Linguagem direta, frases curtas, ritmo de vídeo curto (Reels/TikTok). Sem texto genérico. Seja agressivo e direto. Responda APENAS com o JSON, sem explicações fora do JSON.`;

let selectedDuration = 30;
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let currentResults = null;
let tabId = null;

const states = ['stateIdle', 'stateRecording', 'stateTranscribing', 'stateAnalyzing', 'stateResults', 'stateError'];

function showState(name) {
  states.forEach(s => {
    const el = document.getElementById(s);
    el.classList.remove('active');
    el.style.display = 'none';
  });
  const target = document.getElementById(name);
  target.style.display = 'flex';
  target.classList.add('active');
}

function showError(msg) {
  document.getElementById('errorMessage').textContent = msg;
  showState('stateError');
}

async function getSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['openaiKey', 'claudeKey'], resolve);
  });
}

async function getCurrentTab() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs[0]));
  });
}

async function detectVideo() {
  const tab = await getCurrentTab();
  if (!tab) return null;

  tabId = tab.id;
  const host = new URL(tab.url).hostname;
  const supported = ['instagram.com', 'tiktok.com', 'youtube.com'];
  const platform = supported.find(p => host.includes(p));

  if (!platform) return null;

  try {
    const info = await chrome.tabs.sendMessage(tab.id, { type: 'GET_VIDEO_INFO' });
    return { ...info, platform };
  } catch {
    return { platform, duration: 0 };
  }
}

function updateIdleState(videoInfo) {
  const badge = document.getElementById('platformBadge');
  const statusIcon = document.querySelector('.status-icon');
  const statusText = document.getElementById('videoStatusText');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const videoStatus = document.getElementById('videoStatus');

  if (videoInfo) {
    badge.textContent = videoInfo.platform;
    badge.classList.add('detected');
    statusIcon.textContent = '✅';
    statusText.textContent = `Vídeo detectado${videoInfo.duration ? ` • ${Math.round(videoInfo.duration)}s` : ''}`;
    videoStatus.classList.add('found');
    analyzeBtn.disabled = false;
  } else {
    badge.textContent = 'Plataforma não suportada';
    statusIcon.textContent = '🎬';
    statusText.textContent = 'Acesse Instagram, TikTok ou YouTube';
    analyzeBtn.disabled = true;
  }
}

async function startRecording() {
  const settings = await getSettings();

  if (!settings.openaiKey || !settings.claudeKey) {
    showError('Configure suas chaves de API nas configurações (⚙️) antes de continuar.');
    return;
  }

  const tab = await getCurrentTab();
  if (!tab) {
    showError('Não foi possível acessar a aba ativa.');
    return;
  }

  showState('stateRecording');

  const response = await new Promise(resolve => {
    chrome.runtime.sendMessage({ type: 'GET_STREAM_ID', tabId: tab.id }, resolve);
  });

  if (response.error || !response.streamId) {
    showError('Não foi possível capturar o áudio da aba. Tente novamente.');
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'PLAY_FROM_START' });
  } catch {}

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: response.streamId
        }
      },
      video: false
    });
  } catch (err) {
    showError(`Permissão de áudio negada: ${err.message}`);
    return;
  }

  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

  mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) audioChunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    stream.getTracks().forEach(t => t.stop());
    clearInterval(recordingTimer);
    await processAudio();
  };

  mediaRecorder.start(1000);

  let elapsed = 0;
  const total = selectedDuration;
  const progressEl = document.getElementById('recordingProgress');
  const timerEl = document.getElementById('recordingTimer');

  recordingTimer = setInterval(() => {
    elapsed++;
    timerEl.textContent = `${elapsed}s / ${total}s`;
    progressEl.style.width = `${(elapsed / total) * 100}%`;

    if (elapsed >= total) {
      stopRecording();
    }
  }, 1000);
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

async function processAudio() {
  showState('stateTranscribing');

  const settings = await getSettings();
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

  let transcript;
  try {
    transcript = await transcribeWithWhisper(audioBlob, settings.openaiKey);
  } catch (err) {
    showError(`Erro na transcrição: ${err.message}`);
    return;
  }

  if (!transcript || transcript.trim().length < 10) {
    showError('Transcrição vazia ou muito curta. Certifique-se de que o vídeo tem áudio e tente novamente.');
    return;
  }

  await analyzeWithClaude(transcript, settings.claudeKey);
}

async function transcribeWithWhisper(audioBlob, apiKey) {
  const formData = new FormData();
  formData.append('file', new File([audioBlob], 'audio.webm', { type: 'audio/webm' }));
  formData.append('model', 'whisper-1');
  formData.append('language', 'pt');
  formData.append('response_format', 'text');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  return await res.text();
}

async function analyzeWithClaude(transcript, apiKey) {
  showState('stateAnalyzing');

  const steps = ['astep1', 'astep2', 'astep3', 'astep4'];
  let stepIndex = 0;

  const stepInterval = setInterval(() => {
    if (stepIndex < steps.length) {
      if (stepIndex > 0) {
        const prev = document.getElementById(steps[stepIndex - 1]);
        prev.classList.remove('active');
        prev.classList.add('done');
        prev.querySelector('.astep-icon').textContent = '✅';
      }
      const cur = document.getElementById(steps[stepIndex]);
      cur.classList.add('active');
      cur.querySelector('.astep-icon').textContent = '🔄';
      stepIndex++;
    }
  }, 2000);

  let result;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: CLAUDE_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Aqui está a transcrição do vídeo viral:\n\n"${transcript}"\n\nAnalise e retorne o JSON completo.`
          }
        ]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = data.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Resposta inválida da IA');
    result = JSON.parse(jsonMatch[0]);
  } catch (err) {
    clearInterval(stepInterval);
    showError(`Erro na análise: ${err.message}`);
    return;
  }

  clearInterval(stepInterval);
  steps.forEach(s => {
    const el = document.getElementById(s);
    el.classList.remove('active');
    el.classList.add('done');
    el.querySelector('.astep-icon').textContent = '✅';
  });

  currentResults = { transcript: transcript, ...result };

  setTimeout(() => renderResults(currentResults), 500);
}

function renderResults(data) {
  showState('stateResults');
  renderTab('transcript');

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderTab(tab.dataset.tab);
    });
  });
}

function renderTab(name) {
  const content = document.getElementById('tabContent');

  if (name === 'transcript') {
    content.innerHTML = `
      <h4>Transcrição</h4>
      <p>${escHtml(currentResults.transcript)}</p>
    `;
  }

  else if (name === 'raiox') {
    const r = currentResults.raiox || {};
    content.innerHTML = `
      <h4>Gancho Inicial</h4><p>${escHtml(r.gancho || '—')}</p>
      <h4>Promessa Principal</h4><p>${escHtml(r.promessa || '—')}</p>
      <h4>Dor Explorada</h4><p>${escHtml(r.dor || '—')}</p>
      <h4>Desejo Ativado</h4><p>${escHtml(r.desejo || '—')}</p>
      <h4>Prova / Autoridade</h4><p>${escHtml(r.prova || '—')}</p>
      <h4>Estrutura</h4><p>${escHtml(r.estrutura || '—')}</p>
      <h4>Padrões Emocionais</h4>
      <p>${(r.padroes_emocionais || []).map(p => `<span class="tag">${escHtml(p)}</span>`).join(' ')}</p>
      <h4>CTA</h4><p>${escHtml(r.cta || '—')}</p>
    `;
  }

  else if (name === 'reverse') {
    const e = currentResults.engenharia_reversa || {};
    content.innerHTML = `
      <h4>Por que prende atenção</h4><p>${escHtml(e.por_que_prende || '—')}</p>
      <h4>Onde perde atenção</h4><p>${escHtml(e.onde_perde || '—')}</p>
      <h4>O que pode ser melhorado</h4><p>${escHtml(e.melhorias || '—')}</p>
      <h4>Partes replicáveis</h4><p>${escHtml(e.replicavel || '—')}</p>
      <h4>Partes descartáveis</h4><p>${escHtml(e.descartavel || '—')}</p>
    `;
  }

  else if (name === 'scripts') {
    const roteiros = currentResults.roteiros || [];
    content.innerHTML = roteiros.map((r, i) => `
      <div class="roteiro-block">
        <h5>Roteiro ${i + 1} — ${escHtml(r.nome || '')}</h5>
        <div class="roteiro-label">Gancho</div>
        <div class="roteiro-text">${escHtml(r.gancho || '')}</div>
        <div class="roteiro-label">Desenvolvimento</div>
        <div class="roteiro-text">${escHtml(r.desenvolvimento || '')}</div>
        <div class="roteiro-label">Clímax</div>
        <div class="roteiro-text">${escHtml(r.climax || '')}</div>
        <div class="roteiro-label">CTA</div>
        <div class="roteiro-text">${escHtml(r.cta || '')}</div>
      </div>
    `).join('');
  }

  else if (name === 'extras') {
    const ex = currentResults.extras || {};
    const variacoes = ex.variacoes_gancho || {};
    const varHtml = Object.entries(variacoes).map(([rot, vars]) => `
      <h4>Variações — ${escHtml(rot)}</h4>
      ${vars.map((v, i) => `<p>${i + 1}. ${escHtml(v)}</p>`).join('')}
    `).join('');

    const titulos = (ex.titulos || []).map((t, i) => `<p>${i + 1}. ${escHtml(t)}</p>`).join('');

    content.innerHTML = `
      ${varHtml}
      <h4>Títulos Chamativos</h4>${titulos}
      <h4>Cenário e Linguagem Corporal</h4>
      <p>${escHtml(ex.cenario_linguagem || '—')}</p>
    `;
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function copyAllResults() {
  if (!currentResults) return;

  const lines = [];
  lines.push('=== TRANSCRIÇÃO ===');
  lines.push(currentResults.transcript);

  const r = currentResults.raiox || {};
  lines.push('\n=== RAIO-X ===');
  lines.push(`Gancho: ${r.gancho}`);
  lines.push(`Promessa: ${r.promessa}`);
  lines.push(`Dor: ${r.dor}`);
  lines.push(`Desejo: ${r.desejo}`);
  lines.push(`Prova: ${r.prova}`);
  lines.push(`Estrutura: ${r.estrutura}`);
  lines.push(`Padrões: ${(r.padroes_emocionais || []).join(', ')}`);
  lines.push(`CTA: ${r.cta}`);

  const e = currentResults.engenharia_reversa || {};
  lines.push('\n=== ENGENHARIA REVERSA ===');
  lines.push(`Por que prende: ${e.por_que_prende}`);
  lines.push(`Onde perde: ${e.onde_perde}`);
  lines.push(`Melhorias: ${e.melhorias}`);
  lines.push(`Replicável: ${e.replicavel}`);
  lines.push(`Descartável: ${e.descartavel}`);

  (currentResults.roteiros || []).forEach((rot, i) => {
    lines.push(`\n=== ROTEIRO ${i + 1} — ${rot.nome} ===`);
    lines.push(`GANCHO: ${rot.gancho}`);
    lines.push(`DESENVOLVIMENTO: ${rot.desenvolvimento}`);
    lines.push(`CLÍMAX: ${rot.climax}`);
    lines.push(`CTA: ${rot.cta}`);
  });

  const ex = currentResults.extras || {};
  lines.push('\n=== EXTRAS ===');
  lines.push(`Títulos: ${(ex.titulos || []).join(' | ')}`);
  lines.push(`Cenário: ${ex.cenario_linguagem}`);

  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✅';
    setTimeout(() => (btn.textContent = '📋'), 2000);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  showState('stateIdle');

  const videoInfo = await detectVideo();
  updateIdleState(videoInfo);

  document.querySelectorAll('.dur-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDuration = parseInt(btn.dataset.dur);
    });
  });

  document.getElementById('analyzeBtn').addEventListener('click', startRecording);
  document.getElementById('stopBtn').addEventListener('click', stopRecording);

  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('copyBtn').addEventListener('click', copyAllResults);

  document.getElementById('newAnalysisBtn').addEventListener('click', async () => {
    currentResults = null;
    showState('stateIdle');
    const info = await detectVideo();
    updateIdleState(info);
  });

  document.getElementById('retryBtn').addEventListener('click', async () => {
    showState('stateIdle');
    const info = await detectVideo();
    updateIdleState(info);
  });

  document.getElementById('errorSettingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
