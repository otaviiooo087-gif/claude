import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode';
import { fileURLToPath } from 'node:url';

const AUTH_DIR = fileURLToPath(new URL('../auth_info', import.meta.url));
const logger = pino({ level: 'silent' });

let sock = null;
let connecting = false;

export async function startWhatsApp({ onInbound, onConnectionUpdate, onQR }) {
  if (connecting) return;
  connecting = true;

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch {
    version = undefined; // usa a versão embutida do Baileys se estiver offline
  }

  sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ['WhatsApp AI Dashboard', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const dataUrl = await qrcode.toDataURL(qr, { margin: 1, width: 320 });
        onQR?.(dataUrl);
      } catch (err) {
        console.error('[whatsapp] erro ao gerar QR:', err.message);
      }
      onConnectionUpdate?.({ status: 'qr' });
    }

    if (connection === 'connecting') {
      onConnectionUpdate?.({ status: 'connecting' });
    } else if (connection === 'open') {
      const me = sock.user;
      onQR?.(null);
      onConnectionUpdate?.({
        status: 'open',
        me: {
          id: me?.id || '',
          name: me?.name || me?.verifiedName || '',
          number: me?.id ? me.id.split(':')[0].split('@')[0] : '',
        },
      });
      console.log('[whatsapp] conectado como', me?.id);
    } else if (connection === 'close') {
      connecting = false;
      const code =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : undefined;
      const loggedOut = code === DisconnectReason.loggedOut;
      onConnectionUpdate?.({ status: loggedOut ? 'logged_out' : 'close' });
      if (loggedOut) {
        console.log('[whatsapp] logout detectado. Apague a pasta server/auth_info para reconectar.');
      } else {
        console.log('[whatsapp] conexão caiu — reconectando em 2.5s...');
        setTimeout(() => startWhatsApp({ onInbound, onConnectionUpdate, onQR }), 2500);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      try {
        if (m.key.fromMe) continue;
        const jid = m.key.remoteJid;
        if (!jid || jid === 'status@broadcast') continue;
        if (jid.endsWith('@g.us')) continue; // ignora grupos
        const text = extractText(m.message);
        if (!text) continue;
        const name = m.pushName || jid.split('@')[0];
        onInbound?.({ conversationId: jid, name, text });
      } catch (err) {
        console.error('[whatsapp] erro ao processar mensagem:', err.message);
      }
    }
  });

  connecting = false;
}

export async function sendText(jid, text) {
  if (!sock) return;
  await sock.sendMessage(jid, { text });
}

export async function sendPresence(jid, presence) {
  if (!sock) return;
  try {
    await sock.presenceSubscribe(jid);
    await sock.sendPresenceUpdate(presence, jid);
  } catch {
    /* presença é "best effort" */
  }
}

function extractText(message) {
  if (!message) return '';
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.listResponseMessage?.title ||
    ''
  ).trim();
}
