'use strict';

const sharp  = require('sharp');
const { generateCustomBackground } = require('./backgroundManager');
const { applyLogo } = require('./logoOverlay');

const W = 1080;
const H = 1350;

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  const local  = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0,2)}) ${local.slice(2,7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0,2)}) ${local.slice(2,6)}-${local.slice(6)}`;
  return raw;
}

function buildAdOverlay(tema, telefone) {
  const formattedPhone = formatPhone(telefone);

  // Quebra o tema em até 3 linhas de ~22 chars
  const words   = tema.toUpperCase().split(' ');
  const lines   = [];
  let   current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > 22) {
      lines.push(current.trim());
      current = w;
    } else {
      current = (current + ' ' + w).trim();
    }
    if (lines.length === 2) { current = words.slice(words.indexOf(w)).join(' ').toUpperCase(); break; }
  }
  if (current) lines.push(current.trim());
  const displayLines = lines.slice(0, 3);

  const FS       = displayLines.length >= 3 ? 72 : 88;
  const LINE_H   = Math.round(FS * 1.2);
  const HL_START = 280;
  const lastHL   = HL_START + (displayLines.length - 1) * LINE_H;

  const dividerY  = lastHL + 55;
  const subtitleY = dividerY + 65;
  const ctaTop    = subtitleY + 80;
  const ctaH      = 80;
  const sepY      = ctaTop + ctaH + 80;
  const phoneY    = sepY + 100;

  const headlinesSVG = displayLines.map((l, i) => `
  <text x="60" y="${HL_START + i * LINE_H}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="${FS}" font-weight="900" letter-spacing="-0.5"
    fill="url(#goldText)">${l}</text>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#6A4800"/>
      <stop offset="20%"  stop-color="#C9940A"/>
      <stop offset="50%"  stop-color="#F5D060"/>
      <stop offset="75%"  stop-color="#C8900E"/>
      <stop offset="100%" stop-color="#6A4800"/>
    </linearGradient>
    <linearGradient id="goldAccent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#C9940A"/>
      <stop offset="50%"  stop-color="#F0C030"/>
      <stop offset="100%" stop-color="#C9940A"/>
    </linearGradient>
    <linearGradient id="darkLeft" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="rgba(3,3,3,0.98)"/>
      <stop offset="45%"  stop-color="rgba(3,3,3,0.88)"/>
      <stop offset="70%"  stop-color="rgba(3,3,3,0.55)"/>
      <stop offset="100%" stop-color="rgba(3,3,3,0.10)"/>
    </linearGradient>
    <linearGradient id="darkBottom" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="rgba(3,3,3,0.0)"/>
      <stop offset="45%"  stop-color="rgba(3,3,3,0.88)"/>
      <stop offset="100%" stop-color="rgba(3,3,3,0.98)"/>
    </linearGradient>
    <linearGradient id="goldBorderH" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="rgba(120,84,0,0)"/>
      <stop offset="15%"  stop-color="#C9940A"/>
      <stop offset="50%"  stop-color="#F0C030"/>
      <stop offset="85%"  stop-color="#C9940A"/>
      <stop offset="100%" stop-color="rgba(120,84,0,0)"/>
    </linearGradient>
    <linearGradient id="goldBorderV" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="rgba(120,84,0,0)"/>
      <stop offset="15%"  stop-color="#C9940A"/>
      <stop offset="50%"  stop-color="#F0C030"/>
      <stop offset="85%"  stop-color="#C9940A"/>
      <stop offset="100%" stop-color="rgba(120,84,0,0)"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#darkLeft)"/>
  <rect y="${sepY - 120}" width="${W}" height="${H - sepY + 120}" fill="url(#darkBottom)"/>

  <!-- Bordas douradas (4 lados) -->
  <rect x="0" y="0" width="${W}" height="5" fill="url(#goldBorderH)"/>
  <rect x="0" y="${H-5}" width="${W}" height="5" fill="url(#goldBorderH)"/>
  <rect x="0" y="0" width="4" height="${H}" fill="url(#goldBorderV)"/>
  <rect x="${W-4}" y="0" width="4" height="${H}" fill="url(#goldBorderV)"/>

  ${headlinesSVG}

  <rect x="60" y="${dividerY}" width="150" height="4" rx="2" fill="url(#goldAccent)"/>

  <text x="60" y="${subtitleY}"
    font-family="Arial, sans-serif" font-size="34" letter-spacing="0.3"
    fill="rgba(255,255,255,0.88)">Solicite uma avaliação gratuita</text>

  <!-- CTA button premium -->
  <rect x="60" y="${ctaTop}" width="460" height="${ctaH}" rx="12"
    fill="rgba(8,8,8,0.92)" stroke="rgba(200,155,20,0.45)" stroke-width="1.5"/>
  <text x="290" y="${ctaTop + 52}" text-anchor="middle"
    font-family="Arial, sans-serif" font-size="28" font-weight="bold" letter-spacing="0.5"
    fill="url(#goldAccent)">&#128247; Fale com um especialista</text>

  <!-- Divisor dourado -->
  <rect x="0" y="${sepY}" width="${W}" height="1.5" fill="url(#goldBorderH)" opacity="0.6"/>

  <!-- Círculo WhatsApp + Número -->
  <circle cx="90" cy="${phoneY}" r="40" fill="#1DA851"/>
  <circle cx="90" cy="${phoneY}" r="36" fill="#25D366"/>
  <text x="90" y="${phoneY + 13}" text-anchor="middle"
    font-family="Arial" font-size="32" fill="white">&#10003;</text>
  <text x="152" y="${phoneY + 20}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="60" font-weight="900" letter-spacing="-1"
    fill="white">${formattedPhone}</text>

  <text x="${W/2}" y="${phoneY + 85}" text-anchor="middle"
    font-family="Arial" font-size="20" letter-spacing="1"
    fill="rgba(255,255,255,0.25)">RDZ CONSULTORIA FINANCEIRA</text>
</svg>`;
}

async function generateAdImage(tema, telefone) {
  console.log(`[IA] Gerando fundo premium para "${tema}"...`);

  const bgRaw = await generateCustomBackground(tema);

  const bgBuf = await sharp(bgRaw)
    .resize(W, H, { fit: 'cover', position: 'right' })
    .png()
    .toBuffer();

  const overlayBuf = await sharp(Buffer.from(buildAdOverlay(tema, telefone)))
    .png()
    .toBuffer();

  let result = await sharp(bgBuf)
    .composite([{ input: overlayBuf, blend: 'over' }])
    .png({ compressionLevel: 8 })
    .toBuffer();

  result = await applyLogo(result);

  return result;
}

module.exports = { generateAdImage };
