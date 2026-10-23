import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import { config } from './config.js';
import { loadStore, getState } from './store.js';
import { computeStats } from './stats.js';
import { createEngine } from './engine.js';
import { createDemo } from './demo.js';
import { aiAvailable } from './ai.js';
import { startWhatsApp, sendText, sendPresence } from './whatsapp.js';

loadStore();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// Estado de runtime que precisa ser reenviado a cada novo cliente que conecta.
const runtime = {
  connection: { status: config.whatsappEnabled ? 'connecting' : 'idle' },
  me: null,
  qr: null,
  demo: false,
};

const engine = createEngine({ io, wa: { sendText, sendPresence } });
const demo = createDemo({ handleInbound: engine.handleInbound });

function snapshot() {
  const { conversations, messages } = getState();
  return {
    connection: runtime.connection,
    me: runtime.me,
    qr: runtime.qr,
    demo: runtime.demo,
    aiAvailable: aiAvailable(),
    botName: config.botName,
    conversations: Object.values(conversations).sort((a, b) => b.lastTs - a.lastTs),
    messages,
    stats: computeStats(),
  };
}

function setDemo(on) {
  runtime.demo = on;
  if (on) demo.start();
  else demo.stop();
  io.emit('demo', { on });
}

io.on('connection', (socket) => {
  socket.emit('bootstrap', snapshot());
  socket.on('demo:toggle', (on) => setDemo(Boolean(on)));
});

// ---- API REST (útil para health check / debug) ----
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    ai: aiAvailable(),
    demo: runtime.demo,
    connection: runtime.connection.status,
  });
});
app.get('/api/state', (req, res) => res.json(snapshot()));

// ---- Em produção, serve o client já buildado (client/dist) ----
const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
if (existsSync(clientDist)) {
  const indexHtml = fileURLToPath(new URL('../../client/dist/index.html', import.meta.url));
  app.use(express.static(clientDist));
  app.use((req, res) => res.sendFile(indexHtml)); // SPA fallback (Express 5)
}

httpServer.listen(config.port, () => {
  console.log('\n  🟢 Servidor no ar:    http://localhost:' + config.port);
  console.log('  📊 Dashboard (dev):   http://localhost:5173');
  console.log(
    '  🤖 IA:                ' +
      (aiAvailable() ? `ativa (${config.model})` : 'fallback (defina OPENAI_API_KEY)'),
  );
  console.log(
    '  💬 WhatsApp:          ' +
      (config.whatsappEnabled ? 'conectando...' : 'desativado (use o modo demo)') +
      '\n',
  );
});

// ---- Inicia o WhatsApp (se habilitado) ----
if (config.whatsappEnabled) {
  startWhatsApp({
    onInbound: (payload) => engine.handleInbound(payload),
    onQR: (dataUrl) => {
      runtime.qr = dataUrl;
      io.emit('wa:qr', { dataUrl });
    },
    onConnectionUpdate: (u) => {
      runtime.connection = { status: u.status };
      if (u.me) runtime.me = u.me;
      if (u.status === 'open') runtime.qr = null;
      io.emit('wa:connection', { status: runtime.connection.status, me: runtime.me });
    },
  }).catch((err) => {
    console.error('[whatsapp] falha ao iniciar:', err.message);
    runtime.connection = { status: 'error' };
    io.emit('wa:connection', { status: 'error', me: null });
  });
}
