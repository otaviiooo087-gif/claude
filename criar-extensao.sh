#!/bin/bash
set -e

DEST="$HOME/Desktop/viral-analyzer-extension"
mkdir -p "$DEST/icons"

echo "Criando extensão em: $DEST"

# ── manifest.json ──────────────────────────────────────────────────────────
cat > "$DEST/manifest.json" << 'ENDOFFILE'
{
  "manifest_version": 3,
  "name": "Viral Video Analyzer",
  "version": "1.0.0",
  "description": "Analisa vídeos virais, transcreve, faz engenharia reversa e gera roteiros de alta conversão.",
  "permissions": ["activeTab","scripting","storage","tabCapture"],
  "host_permissions": [
    "https://www.instagram.com/*",
    "https://www.tiktok.com/*",
    "https://www.youtube.com/*",
    "https://api.openai.com/*",
    "https://api.anthropic.com/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Viral Video Analyzer",
    "default_icon": {"16":"icons/icon16.png","48":"icons/icon48.png","128":"icons/icon128.png"}
  },
  "background": {"service_worker": "background.js"},
  "content_scripts": [{
    "matches": ["https://www.instagram.com/*","https://www.tiktok.com/*","https://www.youtube.com/*"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }],
  "options_page": "settings.html",
  "icons": {"16":"icons/icon16.png","48":"icons/icon48.png","128":"icons/icon128.png"}
}
ENDOFFILE

# ── background.js ──────────────────────────────────────────────────────────
cat > "$DEST/background.js" << 'ENDOFFILE'
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STREAM_ID') {
    chrome.tabCapture.getMediaStreamId(
      { targetTabId: message.tabId },
      (streamId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ streamId });
        }
      }
    );
    return true;
  }
});
ENDOFFILE

# ── content.js ─────────────────────────────────────────────────────────────
cat > "$DEST/content.js" << 'ENDOFFILE'
function detectPlatform() {
  const host = window.location.hostname;
  if (host.includes('instagram.com')) return 'Instagram';
  if (host.includes('tiktok.com')) return 'TikTok';
  if (host.includes('youtube.com')) return 'YouTube';
  return 'Unknown';
}

function getVideoInfo() {
  const video = document.querySelector('video');
  if (!video) return null;
  return {
    platform: detectPlatform(),
    duration: video.duration || 0,
    currentTime: video.currentTime || 0,
    paused: video.paused,
    url: window.location.href
  };
}

function seekVideoToStart() {
  const video = document.querySelector('video');
  if (video) { video.currentTime = 0; video.play().catch(() => {}); }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_VIDEO_INFO') sendResponse(getVideoInfo());
  if (message.type === 'PLAY_FROM_START') { seekVideoToStart(); sendResponse({ success: true }); }
  if (message.type === 'ENSURE_PLAYING') {
    const v = document.querySelector('video');
    if (v && v.paused) v.play().catch(() => {});
    sendResponse({ success: true });
  }
});
ENDOFFILE

# ── popup.html ─────────────────────────────────────────────────────────────
cat > "$DEST/popup.html" << 'ENDOFFILE'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Viral Video Analyzer</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
<div class="container">
  <header>
    <div class="logo"><span class="logo-icon">⚡</span><span class="logo-text">Viral Analyzer</span></div>
    <button class="settings-btn" id="settingsBtn" title="Configurações">⚙️</button>
  </header>

  <div id="stateIdle" class="state active">
    <div class="platform-badge" id="platformBadge">Detectando...</div>
    <div class="video-status" id="videoStatus">
      <div class="status-icon">🎬</div>
      <p id="videoStatusText">Nenhum vídeo detectado</p>
    </div>
    <div class="duration-control">
      <label>Duração da gravação</label>
      <div class="duration-options">
        <button class="dur-btn active" data-dur="30">30s</button>
        <button class="dur-btn" data-dur="60">60s</button>
        <button class="dur-btn" data-dur="90">90s</button>
        <button class="dur-btn" data-dur="120">120s</button>
      </div>
    </div>
    <button class="btn-primary" id="analyzeBtn" disabled>🔍 Analisar Vídeo</button>
    <p class="hint">Abra um Reel, TikTok ou YouTube e clique em Analisar</p>
  </div>

  <div id="stateRecording" class="state">
    <div class="recording-header"><div class="rec-dot"></div><span>Capturando áudio</span></div>
    <div class="waveform"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
    <div class="progress-bar"><div class="progress-fill" id="recordingProgress"></div></div>
    <p class="timer" id="recordingTimer">0s</p>
    <button class="btn-secondary" id="stopBtn">⏹ Parar e Analisar</button>
  </div>

  <div id="stateTranscribing" class="state">
    <div class="spinner"></div>
    <h3>Transcrevendo...</h3>
    <p class="sub">Convertendo áudio em texto com Whisper AI</p>
  </div>

  <div id="stateAnalyzing" class="state">
    <div class="spinner"></div>
    <h3>Analisando padrões...</h3>
    <div class="analysis-steps">
      <div class="astep" id="astep1"><span class="astep-icon">⏳</span><span>Raio-X do vídeo</span></div>
      <div class="astep" id="astep2"><span class="astep-icon">⏳</span><span>Engenharia reversa</span></div>
      <div class="astep" id="astep3"><span class="astep-icon">⏳</span><span>Criando 5 roteiros</span></div>
      <div class="astep" id="astep4"><span class="astep-icon">⏳</span><span>Ganchos e extras</span></div>
    </div>
  </div>

  <div id="stateResults" class="state">
    <div class="results-header">
      <h3>✅ Análise Completa</h3>
      <div class="result-actions">
        <button class="btn-icon" id="copyBtn" title="Copiar tudo">📋</button>
        <button class="btn-icon" id="newAnalysisBtn" title="Nova análise">🔄</button>
      </div>
    </div>
    <div class="tabs">
      <button class="tab active" data-tab="transcript">📝 Transcrição</button>
      <button class="tab" data-tab="raiox">🎯 Raio-X</button>
      <button class="tab" data-tab="reverse">🔬 Reverso</button>
      <button class="tab" data-tab="scripts">✍️ Roteiros</button>
      <button class="tab" data-tab="extras">🚀 Extras</button>
    </div>
    <div class="tab-content" id="tabContent"></div>
  </div>

  <div id="stateError" class="state">
    <div class="error-icon">⚠️</div>
    <h3>Erro</h3>
    <p id="errorMessage">Algo deu errado.</p>
    <button class="btn-primary" id="retryBtn">Tentar novamente</button>
    <button class="btn-secondary mt8" id="errorSettingsBtn">Verificar configurações</button>
  </div>
</div>
<script src="popup.js"></script>
</body>
</html>
ENDOFFILE

# ── popup.css ──────────────────────────────────────────────────────────────
cat > "$DEST/popup.css" << 'ENDOFFILE'
*{box-sizing:border-box;margin:0;padding:0}
body{width:380px;min-height:480px;background:#0d0d0d;color:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px}
.container{display:flex;flex-direction:column;min-height:480px}
header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#111;border-bottom:1px solid #222}
.logo{display:flex;align-items:center;gap:8px}
.logo-icon{font-size:18px}
.logo-text{font-size:15px;font-weight:700;background:linear-gradient(135deg,#ff6b35,#f7c59f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.settings-btn{background:none;border:none;cursor:pointer;font-size:16px;opacity:.6;transition:opacity .2s}
.settings-btn:hover{opacity:1}
.state{display:none;flex-direction:column;align-items:center;padding:24px 20px;flex:1;gap:14px}
.state.active{display:flex}
.platform-badge{background:#1a1a2e;border:1px solid #2a2a4a;color:#818cf8;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.platform-badge.detected{background:#0f2a1a;border-color:#1a4a2a;color:#4ade80}
.video-status{text-align:center;padding:20px;background:#111;border:1px solid #222;border-radius:12px;width:100%}
.status-icon{font-size:32px;margin-bottom:8px}
.video-status p{color:#666;font-size:12px}
.video-status.found p{color:#4ade80}
.duration-control{width:100%}
.duration-control label{display:block;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.duration-options{display:flex;gap:8px}
.dur-btn{flex:1;padding:7px 0;background:#1a1a1a;border:1px solid #333;border-radius:8px;color:#888;font-size:12px;cursor:pointer;transition:all .2s}
.dur-btn:hover{border-color:#ff6b35;color:#ff6b35}
.dur-btn.active{background:#ff6b35;border-color:#ff6b35;color:#fff;font-weight:600}
.btn-primary{width:100%;padding:12px;background:linear-gradient(135deg,#ff6b35,#e55a2b);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s}
.btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 20px rgba(255,107,53,.4)}
.btn-primary:disabled{opacity:.4;cursor:not-allowed}
.btn-secondary{width:100%;padding:10px;background:transparent;border:1px solid #444;border-radius:10px;color:#aaa;font-size:13px;cursor:pointer;transition:all .2s}
.btn-secondary:hover{border-color:#666;color:#fff}
.mt8{margin-top:8px}
.hint{color:#444;font-size:11px;text-align:center}
.recording-header{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#f87171}
.rec-dot{width:10px;height:10px;background:#f87171;border-radius:50%;animation:blink 1s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
.waveform{display:flex;align-items:center;gap:4px;height:40px}
.waveform span{display:block;width:4px;background:#ff6b35;border-radius:2px;animation:wave 1.2s ease-in-out infinite}
.waveform span:nth-child(1){animation-delay:0s}.waveform span:nth-child(2){animation-delay:.1s}.waveform span:nth-child(3){animation-delay:.2s}.waveform span:nth-child(4){animation-delay:.3s}.waveform span:nth-child(5){animation-delay:.4s}.waveform span:nth-child(6){animation-delay:.5s}.waveform span:nth-child(7){animation-delay:.6s}.waveform span:nth-child(8){animation-delay:.7s}
@keyframes wave{0%,100%{height:8px}50%{height:32px}}
.progress-bar{width:100%;height:4px;background:#222;border-radius:2px;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,#ff6b35,#f7c59f);border-radius:2px;width:0%;transition:width 1s linear}
.timer{color:#666;font-size:12px;font-family:monospace}
.spinner{width:40px;height:40px;border:3px solid #222;border-top-color:#ff6b35;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
h3{font-size:16px;font-weight:600;color:#f0f0f0}
.sub{color:#555;font-size:12px;text-align:center}
.analysis-steps{width:100%;display:flex;flex-direction:column;gap:8px}
.astep{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#111;border:1px solid #222;border-radius:8px;color:#555;font-size:12px;transition:all .3s}
.astep.active{border-color:#ff6b35;color:#ff6b35;background:#1a0f0a}
.astep.done{border-color:#166534;color:#4ade80;background:#0a1a0f}
.results-header{display:flex;align-items:center;justify-content:space-between;width:100%}
.result-actions{display:flex;gap:6px}
.btn-icon{background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:14px;transition:all .2s}
.btn-icon:hover{border-color:#ff6b35}
.tabs{display:flex;width:100%;gap:4px;background:#111;padding:4px;border-radius:10px;border:1px solid #222}
.tab{flex:1;padding:6px 2px;background:transparent;border:none;border-radius:7px;color:#555;font-size:10px;cursor:pointer;transition:all .2s;white-space:nowrap}
.tab:hover{color:#aaa}
.tab.active{background:#ff6b35;color:#fff;font-weight:600}
.tab-content{width:100%;max-height:300px;overflow-y:auto;background:#111;border:1px solid #222;border-radius:10px;padding:14px;font-size:12px;line-height:1.7;color:#ccc}
.tab-content::-webkit-scrollbar{width:4px}
.tab-content::-webkit-scrollbar-track{background:#111}
.tab-content::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
.tab-content h4{color:#ff6b35;font-size:12px;text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px}
.tab-content h4:first-child{margin-top:0}
.tab-content p{margin-bottom:8px}
.tab-content .tag{display:inline-block;background:#1a0f0a;border:1px solid #ff6b35;color:#ff6b35;padding:2px 8px;border-radius:4px;font-size:10px;margin:2px}
.roteiro-block{background:#0d0d0d;border:1px solid #333;border-radius:8px;padding:12px;margin-bottom:12px}
.roteiro-block h5{color:#ff6b35;font-size:12px;font-weight:700;margin-bottom:10px}
.roteiro-label{color:#666;font-size:10px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
.roteiro-text{color:#ddd;margin-bottom:10px;font-size:12px}
.error-icon{font-size:40px}
#errorMessage{color:#888;text-align:center;font-size:12px}
ENDOFFILE

# ── popup.js ───────────────────────────────────────────────────────────────
cat > "$DEST/popup.js" << 'ENDOFFILE'
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
    "padroes_emocionais": ["urgência", "medo", "status", "ganho"],
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

let selectedDuration = 30, mediaRecorder = null, audioChunks = [], recordingTimer = null, currentResults = null;
const states = ['stateIdle','stateRecording','stateTranscribing','stateAnalyzing','stateResults','stateError'];

function showState(name) {
  states.forEach(s => { const el = document.getElementById(s); el.classList.remove('active'); el.style.display = 'none'; });
  const t = document.getElementById(name); t.style.display = 'flex'; t.classList.add('active');
}

function showError(msg) { document.getElementById('errorMessage').textContent = msg; showState('stateError'); }

async function getSettings() { return new Promise(r => chrome.storage.sync.get(['openaiKey','claudeKey','claudeModel'], r)); }
async function getCurrentTab() { return new Promise(r => chrome.tabs.query({active:true,currentWindow:true}, tabs => r(tabs[0]))); }

async function detectVideo() {
  const tab = await getCurrentTab();
  if (!tab) return null;
  const host = new URL(tab.url).hostname;
  if (!['instagram.com','tiktok.com','youtube.com'].some(p => host.includes(p))) return null;
  try { return await chrome.tabs.sendMessage(tab.id, {type:'GET_VIDEO_INFO'}); } catch { return {platform: host, duration:0}; }
}

function updateIdleState(v) {
  const badge = document.getElementById('platformBadge');
  const icon = document.querySelector('.status-icon');
  const text = document.getElementById('videoStatusText');
  const btn = document.getElementById('analyzeBtn');
  const status = document.getElementById('videoStatus');
  if (v) {
    badge.textContent = v.platform || 'Detectado'; badge.classList.add('detected');
    icon.textContent = '✅'; text.textContent = `Vídeo detectado${v.duration ? ' • '+Math.round(v.duration)+'s' : ''}`;
    status.classList.add('found'); btn.disabled = false;
  } else {
    badge.textContent = 'Não suportado'; icon.textContent = '🎬';
    text.textContent = 'Acesse Instagram, TikTok ou YouTube'; btn.disabled = true;
  }
}

async function startRecording() {
  const s = await getSettings();
  if (!s.openaiKey || !s.claudeKey) { showError('Configure suas chaves de API nas configurações (⚙️).'); return; }
  const tab = await getCurrentTab();
  if (!tab) { showError('Não foi possível acessar a aba ativa.'); return; }
  showState('stateRecording');
  const resp = await new Promise(r => chrome.runtime.sendMessage({type:'GET_STREAM_ID', tabId:tab.id}, r));
  if (resp.error || !resp.streamId) { showError('Não foi possível capturar áudio. Tente novamente.'); return; }
  try { await chrome.tabs.sendMessage(tab.id, {type:'PLAY_FROM_START'}); } catch {}
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {mandatory:{chromeMediaSource:'tab', chromeMediaSourceId:resp.streamId}}, video:false
    });
  } catch(e) { showError(`Permissão negada: ${e.message}`); return; }
  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream, {mimeType:'audio/webm;codecs=opus'});
  mediaRecorder.ondataavailable = e => { if(e.data.size>0) audioChunks.push(e.data); };
  mediaRecorder.onstop = async () => { stream.getTracks().forEach(t=>t.stop()); clearInterval(recordingTimer); await processAudio(); };
  mediaRecorder.start(1000);
  let elapsed = 0; const total = selectedDuration;
  const prog = document.getElementById('recordingProgress');
  const timer = document.getElementById('recordingTimer');
  recordingTimer = setInterval(() => {
    elapsed++;
    timer.textContent = `${elapsed}s / ${total}s`;
    prog.style.width = `${(elapsed/total)*100}%`;
    if (elapsed >= total) stopRecording();
  }, 1000);
}

function stopRecording() { if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop(); }

async function processAudio() {
  showState('stateTranscribing');
  const s = await getSettings();
  const blob = new Blob(audioChunks, {type:'audio/webm'});
  let transcript;
  try { transcript = await transcribeWithWhisper(blob, s.openaiKey); }
  catch(e) { showError(`Erro na transcrição: ${e.message}`); return; }
  if (!transcript || transcript.trim().length < 10) { showError('Transcrição vazia. Certifique-se de que o vídeo tem áudio.'); return; }
  await analyzeWithClaude(transcript, s.claudeKey, s.claudeModel || 'claude-sonnet-4-6');
}

async function transcribeWithWhisper(blob, key) {
  const fd = new FormData();
  fd.append('file', new File([blob], 'audio.webm', {type:'audio/webm'}));
  fd.append('model', 'whisper-1');
  fd.append('language', 'pt');
  fd.append('response_format', 'text');
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method:'POST', headers:{'Authorization':`Bearer ${key}`}, body:fd
  });
  if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.error?.message || `HTTP ${r.status}`); }
  return await r.text();
}

async function analyzeWithClaude(transcript, key, model) {
  showState('stateAnalyzing');
  const steps = ['astep1','astep2','astep3','astep4'];
  let idx = 0;
  const iv = setInterval(() => {
    if (idx < steps.length) {
      if (idx > 0) { const p = document.getElementById(steps[idx-1]); p.classList.remove('active'); p.classList.add('done'); p.querySelector('.astep-icon').textContent='✅'; }
      const c = document.getElementById(steps[idx]); c.classList.add('active'); c.querySelector('.astep-icon').textContent='🔄';
      idx++;
    }
  }, 2000);
  let result;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body: JSON.stringify({model, max_tokens:4096, system:CLAUDE_SYSTEM_PROMPT,
        messages:[{role:'user',content:`Transcrição do vídeo viral:\n\n"${transcript}"\n\nAnalise e retorne o JSON completo.`}]})
    });
    if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.error?.message || `HTTP ${r.status}`); }
    const d = await r.json();
    const m = d.content[0].text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Resposta inválida da IA');
    result = JSON.parse(m[0]);
  } catch(e) { clearInterval(iv); showError(`Erro na análise: ${e.message}`); return; }
  clearInterval(iv);
  steps.forEach(s => { const el=document.getElementById(s); el.classList.remove('active'); el.classList.add('done'); el.querySelector('.astep-icon').textContent='✅'; });
  currentResults = {transcript, ...result};
  setTimeout(() => renderResults(), 500);
}

function renderResults() {
  showState('stateResults');
  renderTab('transcript');
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active'); renderTab(t.dataset.tab);
  }));
}

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function renderTab(name) {
  const c = document.getElementById('tabContent');
  if (name==='transcript') { c.innerHTML=`<h4>Transcrição</h4><p>${esc(currentResults.transcript)}</p>`; return; }
  if (name==='raiox') {
    const r=currentResults.raiox||{};
    c.innerHTML=`<h4>Gancho</h4><p>${esc(r.gancho||'—')}</p><h4>Promessa</h4><p>${esc(r.promessa||'—')}</p><h4>Dor</h4><p>${esc(r.dor||'—')}</p><h4>Desejo</h4><p>${esc(r.desejo||'—')}</p><h4>Prova</h4><p>${esc(r.prova||'—')}</p><h4>Estrutura</h4><p>${esc(r.estrutura||'—')}</p><h4>Padrões Emocionais</h4><p>${(r.padroes_emocionais||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join(' ')}</p><h4>CTA</h4><p>${esc(r.cta||'—')}</p>`; return;
  }
  if (name==='reverse') {
    const e=currentResults.engenharia_reversa||{};
    c.innerHTML=`<h4>Por que prende</h4><p>${esc(e.por_que_prende||'—')}</p><h4>Onde perde</h4><p>${esc(e.onde_perde||'—')}</p><h4>Melhorias</h4><p>${esc(e.melhorias||'—')}</p><h4>Replicável</h4><p>${esc(e.replicavel||'—')}</p><h4>Descartável</h4><p>${esc(e.descartavel||'—')}</p>`; return;
  }
  if (name==='scripts') {
    c.innerHTML=(currentResults.roteiros||[]).map((r,i)=>`<div class="roteiro-block"><h5>Roteiro ${i+1} — ${esc(r.nome||'')}</h5><div class="roteiro-label">Gancho</div><div class="roteiro-text">${esc(r.gancho||'')}</div><div class="roteiro-label">Desenvolvimento</div><div class="roteiro-text">${esc(r.desenvolvimento||'')}</div><div class="roteiro-label">Clímax</div><div class="roteiro-text">${esc(r.climax||'')}</div><div class="roteiro-label">CTA</div><div class="roteiro-text">${esc(r.cta||'')}</div></div>`).join(''); return;
  }
  if (name==='extras') {
    const ex=currentResults.extras||{};
    const v=Object.entries(ex.variacoes_gancho||{}).map(([k,arr])=>`<h4>Variações — ${esc(k)}</h4>${arr.map((x,i)=>`<p>${i+1}. ${esc(x)}</p>`).join('')}`).join('');
    c.innerHTML=`${v}<h4>Títulos</h4>${(ex.titulos||[]).map((t,i)=>`<p>${i+1}. ${esc(t)}</p>`).join('')}<h4>Cenário e Linguagem Corporal</h4><p>${esc(ex.cenario_linguagem||'—')}</p>`;
  }
}

function copyAll() {
  if (!currentResults) return;
  const r=currentResults.raiox||{}, e=currentResults.engenharia_reversa||{}, ex=currentResults.extras||{};
  let txt=`=== TRANSCRIÇÃO ===\n${currentResults.transcript}\n\n=== RAIO-X ===\nGancho: ${r.gancho}\nPromessa: ${r.promessa}\nDor: ${r.dor}\nDesejo: ${r.desejo}\nProva: ${r.prova}\nEstrutura: ${r.estrutura}\nCTA: ${r.cta}\n\n=== ENGENHARIA REVERSA ===\nPor que prende: ${e.por_que_prende}\nOnde perde: ${e.onde_perde}\nMelhorias: ${e.melhorias}\nReplicável: ${e.replicavel}\nDescartável: ${e.descartavel}\n`;
  (currentResults.roteiros||[]).forEach((r,i)=>{ txt+=`\n=== ROTEIRO ${i+1} — ${r.nome} ===\nGANCHO: ${r.gancho}\nDESENVOLVIMENTO: ${r.desenvolvimento}\nCLÍMAX: ${r.climax}\nCTA: ${r.cta}\n`; });
  txt+=`\n=== EXTRAS ===\nTítulos: ${(ex.titulos||[]).join(' | ')}\nCenário: ${ex.cenario_linguagem}`;
  navigator.clipboard.writeText(txt).then(()=>{ const b=document.getElementById('copyBtn'); b.textContent='✅'; setTimeout(()=>b.textContent='📋',2000); });
}

document.addEventListener('DOMContentLoaded', async () => {
  showState('stateIdle');
  updateIdleState(await detectVideo());
  document.querySelectorAll('.dur-btn').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.dur-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); selectedDuration=parseInt(b.dataset.dur);
  }));
  document.getElementById('analyzeBtn').addEventListener('click', startRecording);
  document.getElementById('stopBtn').addEventListener('click', stopRecording);
  document.getElementById('settingsBtn').addEventListener('click', ()=>chrome.runtime.openOptionsPage());
  document.getElementById('copyBtn').addEventListener('click', copyAll);
  document.getElementById('newAnalysisBtn').addEventListener('click', async ()=>{ currentResults=null; showState('stateIdle'); updateIdleState(await detectVideo()); });
  document.getElementById('retryBtn').addEventListener('click', async ()=>{ showState('stateIdle'); updateIdleState(await detectVideo()); });
  document.getElementById('errorSettingsBtn').addEventListener('click', ()=>chrome.runtime.openOptionsPage());
});
ENDOFFILE

# ── settings.html ──────────────────────────────────────────────────────────
cat > "$DEST/settings.html" << 'ENDOFFILE'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Configurações — Viral Analyzer</title>
  <link rel="stylesheet" href="settings.css">
</head>
<body>
<div class="container">
  <header>
    <span class="logo-icon">⚡</span>
    <h1>Viral Analyzer</h1>
    <span class="subtitle">Configurações</span>
  </header>
  <main>
    <div class="section">
      <h2>Chaves de API</h2>
      <p class="desc">Suas chaves são salvas localmente no Chrome e nunca enviadas para terceiros.</p>
      <div class="field">
        <label for="openaiKey">OpenAI API Key <span class="badge">Whisper — Transcrição</span></label>
        <div class="input-row">
          <input type="password" id="openaiKey" placeholder="sk-..." autocomplete="off">
          <button class="toggle-btn" data-target="openaiKey">👁</button>
        </div>
        <p class="field-hint">Usada para transcrever áudio com Whisper-1. <a href="https://platform.openai.com/api-keys" target="_blank">Obter chave →</a></p>
      </div>
      <div class="field">
        <label for="claudeKey">Anthropic API Key <span class="badge">Claude — Análise</span></label>
        <div class="input-row">
          <input type="password" id="claudeKey" placeholder="sk-ant-..." autocomplete="off">
          <button class="toggle-btn" data-target="claudeKey">👁</button>
        </div>
        <p class="field-hint">Usada para análise e roteiros com Claude. <a href="https://console.anthropic.com/settings/keys" target="_blank">Obter chave →</a></p>
      </div>
    </div>
    <div class="section">
      <h2>Modelo Claude</h2>
      <select id="claudeModel">
        <option value="claude-sonnet-4-6">claude-sonnet-4-6 (Recomendado)</option>
        <option value="claude-opus-4-7">claude-opus-4-7 (Mais poderoso)</option>
        <option value="claude-haiku-4-5-20251001">claude-haiku-4-5-20251001 (Mais rápido)</option>
      </select>
    </div>
    <div class="actions">
      <button class="btn-save" id="saveBtn">💾 Salvar Configurações</button>
    </div>
    <div id="saveMsg" class="save-msg"></div>
  </main>
</div>
<script src="settings.js"></script>
</body>
</html>
ENDOFFILE

# ── settings.css ───────────────────────────────────────────────────────────
cat > "$DEST/settings.css" << 'ENDOFFILE'
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;background:#0d0d0d;color:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px}
.container{max-width:560px;margin:0 auto;padding:0 20px 40px}
header{display:flex;align-items:center;gap:10px;padding:24px 0 20px;border-bottom:1px solid #1e1e1e;margin-bottom:32px}
.logo-icon{font-size:22px}
h1{font-size:18px;font-weight:700;background:linear-gradient(135deg,#ff6b35,#f7c59f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.subtitle{font-size:12px;color:#555;margin-left:4px}
.section{margin-bottom:28px}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:16px}
.desc{font-size:12px;color:#555;margin-bottom:20px;line-height:1.5}
.field{margin-bottom:20px}
label{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;color:#ccc;margin-bottom:8px}
.badge{font-size:10px;background:#1a0f0a;border:1px solid #ff6b35;color:#ff6b35;padding:2px 7px;border-radius:4px;font-weight:400}
.input-row{display:flex;gap:8px}
input[type="password"],input[type="text"]{flex:1;background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:10px 14px;color:#f0f0f0;font-size:13px;outline:none;transition:border-color .2s;font-family:monospace}
input:focus{border-color:#ff6b35}
.toggle-btn{background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:10px 12px;cursor:pointer;font-size:14px;color:#666;transition:all .2s}
.toggle-btn:hover{border-color:#444;color:#fff}
.field-hint{font-size:11px;color:#444;margin-top:6px;line-height:1.5}
.field-hint a{color:#ff6b35;text-decoration:none}
.field-hint a:hover{text-decoration:underline}
select{width:100%;background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:10px 14px;color:#f0f0f0;font-size:13px;outline:none;cursor:pointer;transition:border-color .2s}
select:focus{border-color:#ff6b35}
.btn-save{width:100%;padding:12px;background:linear-gradient(135deg,#ff6b35,#e55a2b);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s}
.btn-save:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(255,107,53,.4)}
.save-msg{margin-top:12px;text-align:center;font-size:12px;min-height:18px}
.save-msg.success{color:#4ade80}
.save-msg.error{color:#f87171}
ENDOFFILE

# ── settings.js ────────────────────────────────────────────────────────────
cat > "$DEST/settings.js" << 'ENDOFFILE'
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['openaiKey','claudeKey','claudeModel'], (d) => {
    if (d.openaiKey) document.getElementById('openaiKey').value = d.openaiKey;
    if (d.claudeKey) document.getElementById('claudeKey').value = d.claudeKey;
    if (d.claudeModel) document.getElementById('claudeModel').value = d.claudeModel;
  });
  document.querySelectorAll('.toggle-btn').forEach(b => b.addEventListener('click', () => {
    const i = document.getElementById(b.dataset.target);
    i.type = i.type==='password' ? 'text' : 'password';
    b.textContent = i.type==='password' ? '👁' : '🙈';
  }));
  document.getElementById('saveBtn').addEventListener('click', () => {
    const ok = document.getElementById('openaiKey').value.trim();
    const ck = document.getElementById('claudeKey').value.trim();
    const cm = document.getElementById('claudeModel').value;
    const msg = document.getElementById('saveMsg');
    if (!ok || !ck) { msg.textContent='Preencha ambas as chaves.'; msg.className='save-msg error'; return; }
    if (!ok.startsWith('sk-')) { msg.textContent='Chave OpenAI inválida (deve começar com sk-).'; msg.className='save-msg error'; return; }
    if (!ck.startsWith('sk-ant-')) { msg.textContent='Chave Anthropic inválida (deve começar com sk-ant-).'; msg.className='save-msg error'; return; }
    chrome.storage.sync.set({openaiKey:ok, claudeKey:ck, claudeModel:cm}, () => {
      msg.textContent='✅ Configurações salvas!'; msg.className='save-msg success';
      setTimeout(()=>msg.textContent='', 3000);
    });
  });
});
ENDOFFILE

# ── ícone PNG mínimo ────────────────────────────────────────────────────────
python3 -c "
import struct, zlib

def png(size):
    px = []
    for y in range(size):
        row = [0]
        for x in range(size):
            cx,cy = x-size/2, y-size/2
            r2 = (size*0.45)**2
            if cx*cx+cy*cy <= r2:
                # lightning bolt simple check
                nx,ny = cx/size, cy/size
                if -0.15<=nx<=0.2 and -0.45<=ny<=0.45:
                    row+=[255,107,53,255]
                else:
                    row+=[26,10,0,255]
            else:
                row+=[0,0,0,0]
        px.append(bytes(row))
    raw = b''.join(px)
    sig = b'\x89PNG\r\n\x1a\n'
    def chunk(n,d): c=struct.pack('>I',len(d))+n+d; return c+struct.pack('>I',zlib.crc32(c[4:])&0xffffffff)
    ihdr = chunk(b'IHDR', struct.pack('>II',size,size)+bytes([8,6,0,0,0]))
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    return sig+ihdr+idat+iend

import os
os.makedirs('$DEST/icons', exist_ok=True)
for sz in [16,48,128]:
    open(f'$DEST/icons/icon{sz}.png','wb').write(png(sz))
"

echo ""
echo "✅ Extensão criada com sucesso em:"
echo "   $DEST"
echo ""
echo "Próximos passos:"
echo "  1. Abra chrome://extensions no Chrome"
echo "  2. Ative 'Modo do desenvolvedor'"
echo "  3. Clique em 'Carregar sem compactação'"
echo "  4. Selecione a pasta: $DEST"
