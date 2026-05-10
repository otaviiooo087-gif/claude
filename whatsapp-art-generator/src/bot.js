'use strict';

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const { generateArt } = require('./artGenerator');
const { parseArtCommand, HELP_TEXT } = require('./commands');

const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');

async function startBot() {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(SESSIONS_DIR);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Escaneie o QR code acima com seu WhatsApp para conectar.\n');
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log(`Conexão encerrada (código ${code}). Reconectando: ${shouldReconnect}`);
      if (shouldReconnect) startBot();
    }

    if (connection === 'open') {
      console.log('✅ Bot conectado ao WhatsApp com sucesso!');
      console.log('   Aguardando mensagens dos vendedores...\n');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '';

      if (!text) continue;

      const jid = msg.key.remoteJid;
      const lowerText = text.toLowerCase().trim();

      // Greet / help
      if (lowerText === '!ajuda' || lowerText === '!help' || lowerText === '!arte') {
        await sock.sendMessage(jid, { text: HELP_TEXT });
        continue;
      }

      if (!lowerText.startsWith('!arte ')) continue;

      const parsed = parseArtCommand(text);

      if (!parsed) {
        await sock.sendMessage(jid, {
          text:
            '❌ Não entendi o comando. Use o formato:\n\n' +
            '*!arte limpa nome 11999999999*\n\n' +
            'Digite *!ajuda* para ver todos os comandos.',
        });
        continue;
      }

      try {
        console.log(`[Arte] Gerando "${parsed.templateKey}" para ${parsed.phone}`);
        await sock.sendMessage(jid, { text: '⏳ Gerando sua arte, aguarde...' });

        const imagePath = await generateArt(parsed.templateKey, parsed.phone);
        const imageBuffer = fs.readFileSync(imagePath);

        await sock.sendMessage(jid, {
          image: imageBuffer,
          caption: `✅ Arte pronta! Número: ${parsed.phone}`,
        });

        fs.unlinkSync(imagePath);
        console.log(`[Arte] Enviada com sucesso para ${jid}`);
      } catch (err) {
        console.error('[Arte] Erro ao gerar:', err.message);
        await sock.sendMessage(jid, {
          text: '❌ Ocorreu um erro ao gerar a arte. Tente novamente em alguns instantes.',
        });
      }
    }
  });
}

module.exports = { startBot };
