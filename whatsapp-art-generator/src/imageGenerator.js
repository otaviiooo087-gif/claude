'use strict';

const sharp  = require('sharp');
const { generateCustomBackground } = require('./backgroundManager');
const { applyLogo } = require('./logoOverlay');

const SIZE = 1080;

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
  const words    = tema.toUpperCase().split(' ');
  const lines    = [];
  let   current  = '';
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

  const FS         = displayLines.length >= 3 ? 72 : 88;
  const LINE_H     = Math.round(FS * 1.2);
  const HL_START   = 240;
  const lastHL     = HL_START + (displayLines.length - 1) * LINE_H;
  const dividerY   = lastHL + 50;
  const subtitleY  = dividerY + 60;
  const ctaTop     = subtitleY + 70;
  const ctaH       = 70;
  const sepY       = ctaTop + ctaH + 70;
  const phoneY     = sepY + 90;

  const headlinesSVG = displayLines.map((l, i) => `
  <text x="60" y="${HL_START + i * LINE_H}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="${FS}" font-weight="900"
    fill="url(#goldText)">${l}</text>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#7A5400"/>
      <stop offset="30%"  stop-color="#F5D060"/>
      <stop offset="60%"  stop-color="#C8900E"/>
      <stop offset="100%" stop-color="#7A5400"/>
    </linearGradient>
    <linearGradient id="darkLeft" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="rgba(5,5,5,0.97)"/>
      <stop offset="50%"  stop-color="rgba(5,5,5,0.80)"/>
      <stop offset="75%"  stop-color="rgba(5,5,5,0.45)"/>
      <stop offset="100%" stop-color="rgba(5,5,5,0.10)"/>
    </linearGradient>
    <linearGradient id="darkBottom" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="rgba(5,5,5,0.0)"/>
      <stop offset="50%"  stop-color="rgba(5,5,5,0.88)"/>
      <stop offset="100%" stop-color="rgba(5,5,5,0.97)"/>
    </linearGradient>
    <linearGradient id="goldBorderH" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="rgba(120,84,0,0)"/>
      <stop offset="30%"  stop-color="#F0C030"/>
      <stop offset="70%"  stop-color="#C9940A"/>
      <stop offset="100%" stop-color="rgba(120,84,0,0)"/>
    </linearGradient>
  </defs>

  <rect width="${SIZE}" height="${SIZE}" fill="url(#darkLeft)"/>
  <rect y="${sepY - 100}" width="${SIZE}" height="${SIZE - sepY + 100}" fill="url(#darkBottom)"/>

  <rect x="0" y="0" width="${SIZE}" height="5" fill="url(#goldBorderH)"/>
  <rect x="0" y="${SIZE-5}" width="${SIZE}" height="5" fill="url(#goldBorderH)"/>
  <rect x="0" y="0" width="4" height="${SIZE}" fill="url(#goldBorderH)"/>

  ${headlinesSVG}

  <rect x="60" y="${dividerY}" width="130" height="5" rx="2.5" fill="url(#goldText)"/>

  <text x="60" y="${subtitleY}"
    font-family="Arial, sans-serif" font-size="32"
    fill="rgba(255,255,255,0.90)">Resolva isso agora mesmo!</text>

  <rect x="60" y="${ctaTop}" width="440" height="${ctaH}" rx="${ctaH/2}" fill="#25D366"/>
  <text x="100" y="${ctaTop+48}" font-family="Arial" font-size="30" fill="white">➜</text>
  <text x="285" y="${ctaTop+48}" text-anchor="middle"
    font-family="Arial, sans-serif" font-size="27" font-weight="bold"
    fill="white">Chame agora e resolva</text>

  <rect x="0" y="${sepY}" width="${SIZE}" height="2" fill="url(#goldBorderH)" opacity="0.6"/>

  <circle cx="82" cy="${phoneY}" r="36" fill="#25D366"/>
  <text x="82" y="${phoneY+14}" text-anchor="middle"
    font-family="Arial" font-size="34" fill="white">✓</text>
  <text x="142" y="${phoneY+20}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="60" font-weight="900" fill="white">${formattedPhone}</text>

  <text x="${SIZE/2}" y="${phoneY+80}" text-anchor="middle"
    font-family="Arial" font-size="20"
    fill="rgba(255,255,255,0.28)">wa.me/${telefone.replace(/\D/g,'')}</text>
</svg>`;
}

async function generateAdImage(tema, telefone) {
  console.log(`[IA] Gerando fundo personalizado para "${tema}"...`);

  // 1. Gera fundo fotorrealista gratuito com Pollinations
  const bgRaw = await generateCustomBackground(tema);

  // 2. Redimensiona para 1080×1080
  const bgBuf = await sharp(bgRaw)
    .resize(SIZE, SIZE, { fit: 'cover', position: 'right' })
    .png()
    .toBuffer();

  // 3. Cria overlay com texto dourado, CTA e número
  const overlayBuf = await sharp(Buffer.from(buildAdOverlay(tema, telefone)))
    .png()
    .toBuffer();

  // 4. Compõe fundo + overlay
  let result = await sharp(bgBuf)
    .composite([{ input: overlayBuf, blend: 'over' }])
    .png({ compressionLevel: 8 })
    .toBuffer();

  // 5. Aplica logo fixo
  result = await applyLogo(result);

  return result;
}

module.exports = { generateAdImage };
