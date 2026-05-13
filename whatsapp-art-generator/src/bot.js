'use strict';

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
} = require('@whiskeysockets/baileys');
const pino    = require('pino');
const qrcode  = require('qrcode-terminal');
const fs      = require('fs');
const path    = require('path');

const { generateArt } = require('./artGenerator');
const { parseArtCommand, HELP_TEXT } = require('./commands');
const { generateAdImage } = require('./imageGenerator');
const session = require('./session');

const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return raw;
}

async function handleMessage(sock, jid, text) {
  const lower = text.toLowerCase().trim();

  // ── Cancelar qualquer fluxo ──────────────────────────────────────
  if (lower === '!cancelar' || lower === '!sair') {
    session.resetFlow(jid);
    await sock.sendMessage(jid, { text: '❌ Operação cancelada. Digite *!ajuda* para ver os comandos.' });
    return;
  }

  // ── Ajuda ────────────────────────────────────────────────────────
  if (lower === '!ajuda' || lower === '!help') {
    await sock.sendMessage(jid, { text: HELP_TEXT });
    return;
  }

  // ── Artes prontas por template (!arte ...) ────────────────────────
  if (lower.startsWith('!arte')) {
    if (lower === '!arte') {
      await sock.sendMessage(jid, { text: HELP_TEXT });
      return;
    }
    const parsed = parseArtCommand(text);
    if (!parsed) {
      await sock.sendMessage(jid, {
        text:
          '❌ Comando não reconhecido. Formato:\n\n' +
          '*!arte limpa nome 11999999999*\n\n' +
          'Digite *!ajuda* para ver todos os tipos.',
      });
      return;
    }
    try {
      console.log(`[Arte] Gerando "${parsed.templateKey}" para ${parsed.phone}`);
      await sock.sendMessage(jid, { text: '⏳ Gerando sua arte, aguarde...' });
      const imgPath = await generateArt(parsed.templateKey, parsed.phone);
      const buf = fs.readFileSync(imgPath);
      await sock.sendMessage(jid, { image: buf, caption: `✅ Arte pronta! Número: ${formatPhone(parsed.phone)}` });
      fs.unlinkSync(imgPath);
    } catch (err) {
      console.error('[Arte] Erro:', err.message);
      await sock.sendMessage(jid, { text: '❌ Erro ao gerar a arte. Tente novamente.' });
    }
    return;
  }

  // ── Iniciar gerador de anúncio com IA ────────────────────────────
  if (lower === '!anuncio' || lower === '!anúncio' || lower === '!gerar') {
    if (session.isLockedOut(jid)) {
      await sock.sendMessage(jid, {
        text: '🚫 Acesso bloqueado por tentativas incorretas. Aguarde 5 minutos e tente novamente.',
      });
      return;
    }
    if (!session.isAuthenticated(jid)) {
      session.setFlowState(jid, 'WAITING_PASSWORD');
      await sock.sendMessage(jid, {
        text:
          '🔐 *Gerador de Anúncios com IA*\n\n' +
          'Para continuar, digite a senha de acesso:',
      });
    } else {
      session.setFlowState(jid, 'WAITING_PHONE', { phone: null });
      await sock.sendMessage(jid, {
        text:
          '📱 *Gerador de Anúncios com IA*\n\n' +
          'Qual é o número de WhatsApp para aparecer no anúncio?\n' +
          '_Informe com DDD, ex: 11999999999_\n\n' +
          '_Digite !cancelar para sair._',
      });
    }
    return;
  }

  // ── Fluxo conversacional do gerador de anúncios ───────────────────
  const flowState = session.getFlowState(jid);

  if (flowState === 'WAITING_PASSWORD') {
    if (session.isLockedOut(jid)) {
      await sock.sendMessage(jid, { text: '🚫 Acesso bloqueado. Aguarde 5 minutos.' });
      return;
    }
    const BOT_PASSWORD = process.env.BOT_PASSWORD;
    if (!BOT_PASSWORD) {
      await sock.sendMessage(jid, { text: '⚠️ Senha não configurada no servidor. Configure BOT_PASSWORD no arquivo .env' });
      return;
    }
    if (text.trim() === BOT_PASSWORD) {
      session.authenticate(jid); // já muda state para WAITING_PHONE
      await sock.sendMessage(jid, {
        text:
          '✅ *Acesso liberado!*\n\n' +
          '📱 Qual é o número de WhatsApp para aparecer no anúncio?\n' +
          '_Informe com DDD, ex: 11999999999_\n\n' +
          '_Digite !cancelar para sair._',
      });
    } else {
      const result = session.recordWrongPassword(jid);
      if (result === 'LOCKED') {
        await sock.sendMessage(jid, {
          text: `🚫 Senha incorreta ${session.MAX_ATTEMPTS}x seguidas. Acesso bloqueado por 5 minutos.`,
        });
      } else {
        await sock.sendMessage(jid, {
          text: `❌ Senha incorreta (tentativa ${result}/${session.MAX_ATTEMPTS}). Tente novamente:`,
        });
      }
    }
    return;
  }

  if (flowState === 'WAITING_PHONE') {
    const phone = text.replace(/\D/g, '');
    if (phone.length < 10 || phone.length > 13) {
      await sock.sendMessage(jid, {
        text:
          '❌ Número inválido. Digite apenas os dígitos com DDD.\n' +
          '_Ex: 11999999999 (com DDD)_',
      });
      return;
    }
    session.setFlowState(jid, 'WAITING_THEME', { phone });
    await sock.sendMessage(jid, {
      text:
        `📞 Número confirmado: *${formatPhone(phone)}*\n\n` +
        '🎨 Agora me diga o *tema* do anúncio:\n\n' +
        '_Exemplos:_\n' +
        '• _Limpa nome com juros a partir de 1,5%_\n' +
        '• _Apartamentos de 2 quartos em São Paulo_\n' +
        '• _Empréstimo pessoal sem consulta ao SPC_\n\n' +
        '_Quanto mais detalhar, melhor fica o resultado!_\n' +
        '_Digite !cancelar para sair._',
    });
    return;
  }

  if (flowState === 'WAITING_THEME') {
    const phone = session.getPhone(jid);
    const tema = text.trim();

    if (tema.length < 3) {
      await sock.sendMessage(jid, { text: '❌ Descreva melhor o tema do anúncio.' });
      return;
    }

    session.resetFlow(jid);

    await sock.sendMessage(jid, {
      text:
        '⏳ *Gerando seu anúncio com IA (DALL-E 3)...*\n' +
        'Isso pode levar até 30 segundos. Aguarde!',
    });

    try {
      console.log(`[IA] Tema: "${tema}" | Telefone: ${phone}`);
      const imageBuffer = await generateAdImage(tema, phone);
      await sock.sendMessage(jid, {
        image: imageBuffer,
        caption:
          `✅ *Anúncio gerado com IA!*\n` +
          `📞 Número: ${formatPhone(phone)}\n` +
          `🎨 Tema: ${tema}\n\n` +
          `_Para gerar outro, envie !anuncio_`,
      });
      console.log(`[IA] Enviado com sucesso para ${jid}`);
    } catch (err) {
      console.error('[IA] Erro ao gerar:', err.message);
      const msg = err.message.includes('OPENAI_API_KEY')
        ? '⚠️ Chave da OpenAI não configurada. Verifique o arquivo .env'
        : '❌ Erro ao gerar o anúncio. Verifique sua chave da API e tente novamente.\n\nEnvie *!anuncio* para tentar de novo.';
      await sock.sendMessage(jid, { text: msg });
    }
    return;
  }

  // ── Mensagem sem contexto → mini ajuda ───────────────────────────
  await sock.sendMessage(jid, {
    text:
      'Olá! 👋 Escolha uma opção:\n\n' +
      '*!anuncio* — gerar anúncio com IA\n' +
      '*!arte limpa nome [número]* — arte pronta\n' +
      '*!ajuda* — ver todos os comandos',
  });
}

async function startBot() {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(SESSIONS_DIR);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.clear();
      console.log('📱 Escaneie o QR Code abaixo com seu WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      console.log('\nWhatsApp → 3 pontinhos → Dispositivos conectados → Conectar dispositivo\n');
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log(`Conexão encerrada (${code}). Reconectando: ${shouldReconnect}`);
      if (shouldReconnect) startBot();
    }
    if (connection === 'open') {
      console.log('✅ Bot conectado! Aguardando mensagens...\n');
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
      if (!text.trim()) continue;
      const jid = msg.key.remoteJid;
      try {
        await handleMessage(sock, jid, text);
      } catch (err) {
        console.error(`[Bot] Erro inesperado para ${jid}:`, err.message);
      }
    }
  });
}

module.exports = { startBot };
