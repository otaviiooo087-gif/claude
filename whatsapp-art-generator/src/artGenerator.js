'use strict';

const sharp  = require('sharp');
const fs     = require('fs');
const path   = require('path');
const { TEMPLATES }          = require('./templates');
const { applyLogo, hasLogo } = require('./logoOverlay');
const { ensureBackground }   = require('./backgroundManager');

const SIZE = 1080;

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  const local  = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0,2)}) ${local.slice(2,7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0,2)}) ${local.slice(2,6)}-${local.slice(6)}`;
  return raw;
}

/**
 * SVG de overlay transparente: gradiente escuro + texto dourado + CTA.
 * Composto sobre a foto de fundo gerada pelo backgroundManager.
 */
function buildOverlaySVG(templateKey, phone) {
  const tmpl = TEMPLATES[templateKey];
  if (!tmpl) throw new Error(`Template desconhecido: ${templateKey}`);

  const { headlineLines, headlineFontSize, subtitle, cta, category } = tmpl;
  const formattedPhone = formatPhone(phone);

  const LINE_H         = Math.round(headlineFontSize * 1.18);
  const HL_START       = 230;
  const lastHeadlineY  = HL_START + (headlineLines.length - 1) * LINE_H;
  const goldBarY       = lastHeadlineY + 38;
  const subtitleStartY = goldBarY + 56;
  const SUBTITLE_LH    = 54;
  const lastSubtitleY  = subtitleStartY + (subtitle.length - 1) * SUBTITLE_LH;
  const ctaTop         = lastSubtitleY + 62;
  const ctaH           = 70;
  const dividerY       = ctaTop + ctaH + 68;
  const phoneCircleY   = dividerY + 88;
  const waLinkY        = phoneCircleY + 72;

  const headlineSVG = headlineLines.map((line, i) => `
  <text x="60" y="${HL_START + i * LINE_H}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="${headlineFontSize}" font-weight="900"
    fill="url(#goldText)">${line}</text>`).join('');

  const subtitleSVG = subtitle.map((line, i) => `
  <text x="60" y="${subtitleStartY + i * SUBTITLE_LH}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="36" fill="rgba(255,255,255,0.92)">${line}</text>`).join('');

  const logoPlaceholder = hasLogo()
    ? `<rect x="25" y="25" width="160" height="160" rx="8" fill="rgba(0,0,0,0)"/>`
    : `<rect x="25" y="25" width="220" height="76" rx="12" fill="rgba(0,0,0,0.55)"/>
       <text x="135" y="71" text-anchor="middle"
         font-family="Arial Black, Arial, sans-serif"
         font-size="18" font-weight="900" fill="rgba(245,210,80,0.9)">GRUPO ITT</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}"
  xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradiente dourado para o texto -->
    <linearGradient id="goldText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#7A5400"/>
      <stop offset="25%"  stop-color="#D4A017"/>
      <stop offset="55%"  stop-color="#F5D060"/>
      <stop offset="75%"  stop-color="#C8900E"/>
      <stop offset="100%" stop-color="#7A5400"/>
    </linearGradient>
    <!-- Overlay escuro: lado esquerdo opaco, direito transparente -->
    <linearGradient id="darkLeft" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="rgba(5,5,5,0.97)"/>
      <stop offset="48%"  stop-color="rgba(5,5,5,0.82)"/>
      <stop offset="70%"  stop-color="rgba(5,5,5,0.50)"/>
      <stop offset="100%" stop-color="rgba(5,5,5,0.12)"/>
    </linearGradient>
    <!-- Overlay escuro no rodapé (para o número ficar legível) -->
    <linearGradient id="darkBottom" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="rgba(5,5,5,0.0)"/>
      <stop offset="55%"  stop-color="rgba(5,5,5,0.85)"/>
      <stop offset="100%" stop-color="rgba(5,5,5,0.97)"/>
    </linearGradient>
    <!-- Bordas douradas -->
    <linearGradient id="goldBorderH" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="rgba(120,84,0,0)"/>
      <stop offset="20%"  stop-color="#C9940A"/>
      <stop offset="50%"  stop-color="#F0C030"/>
      <stop offset="80%"  stop-color="#C9940A"/>
      <stop offset="100%" stop-color="rgba(120,84,0,0)"/>
    </linearGradient>
    <linearGradient id="goldBorderV" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="rgba(120,84,0,0)"/>
      <stop offset="20%"  stop-color="#C9940A"/>
      <stop offset="50%"  stop-color="#F0C030"/>
      <stop offset="80%"  stop-color="#C9940A"/>
      <stop offset="100%" stop-color="rgba(120,84,0,0)"/>
    </linearGradient>
  </defs>

  <!-- ── Overlay escuro lateral (deixa a foto aparecer na direita) ── -->
  <rect width="${SIZE}" height="${SIZE}" fill="url(#darkLeft)"/>

  <!-- ── Overlay escuro inferior (número WhatsApp sempre legível) ─── -->
  <rect y="${dividerY - 80}" width="${SIZE}" height="${SIZE - dividerY + 80}"
    fill="url(#darkBottom)"/>

  <!-- ── Bordas douradas ─────────────────────────────────────────── -->
  <rect x="0" y="0" width="${SIZE}" height="5" fill="url(#goldBorderH)"/>
  <rect x="0" y="${SIZE - 5}" width="${SIZE}" height="5" fill="url(#goldBorderH)"/>
  <rect x="0" y="0" width="4" height="${SIZE}" fill="url(#goldBorderV)"/>

  <!-- ── Logo ───────────────────────────────────────────────────── -->
  ${logoPlaceholder}

  <!-- Categoria -->
  <text x="${SIZE - 30}" y="48" text-anchor="end"
    font-family="Arial, sans-serif" font-size="15" letter-spacing="2.5"
    fill="rgba(197,164,20,0.75)">${category}</text>

  <!-- ── Headline dourado ────────────────────────────────────────── -->
  ${headlineSVG}

  <!-- Barra dourada -->
  <rect x="60" y="${goldBarY}" width="140" height="5" rx="2.5"
    fill="url(#goldText)"/>

  <!-- ── Subtítulo ───────────────────────────────────────────────── -->
  ${subtitleSVG}

  <!-- ── Botão CTA verde ─────────────────────────────────────────── -->
  <rect x="60" y="${ctaTop}" width="460" height="${ctaH}" rx="${ctaH / 2}"
    fill="#25D366"/>
  <text x="100" y="${ctaTop + 48}"
    font-family="Arial, sans-serif" font-size="30" fill="white">➜</text>
  <text x="295" y="${ctaTop + 48}" text-anchor="middle"
    font-family="Arial, sans-serif" font-size="28" font-weight="bold"
    fill="white">${cta}</text>

  <!-- ── Linha divisória dourada ─────────────────────────────────── -->
  <rect x="0" y="${dividerY}" width="${SIZE}" height="2"
    fill="url(#goldBorderH)" opacity="0.6"/>

  <!-- ── Número WhatsApp ─────────────────────────────────────────── -->
  <circle cx="82" cy="${phoneCircleY}" r="36" fill="#25D366"/>
  <text x="82" y="${phoneCircleY + 14}" text-anchor="middle"
    font-family="Arial, sans-serif" font-size="34" fill="white">✓</text>
  <text x="142" y="${phoneCircleY + 20}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="64" font-weight="900" fill="white">${formattedPhone}</text>

  <!-- Link wa.me -->
  <text x="${SIZE / 2}" y="${waLinkY}" text-anchor="middle"
    font-family="Arial, sans-serif" font-size="20"
    fill="rgba(255,255,255,0.28)">wa.me/${phone.replace(/\D/g, '')}</text>
</svg>`;
}

async function generateArt(templateKey, phone) {
  const outputDir = path.join(__dirname, '..', 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  // 1. Busca (ou gera pela primeira vez) a foto de fundo
  const bgPath = await ensureBackground(templateKey);

  let baseBuffer;
  if (bgPath) {
    // Redimensiona a foto para 1080×1080
    baseBuffer = await sharp(bgPath)
      .resize(SIZE, SIZE, { fit: 'cover', position: 'right' })
      .png()
      .toBuffer();
  } else {
    // Sem API key: usa fundo preto sólido
    const fallback = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${SIZE}" height="${SIZE}" fill="#080808"/>
    </svg>`;
    baseBuffer = await sharp(Buffer.from(fallback)).png().toBuffer();
  }

  // 2. Gera o overlay SVG (texto, gradientes, CTA)
  const svgOverlay = buildOverlaySVG(templateKey, phone);
  const overlayBuf = await sharp(Buffer.from(svgOverlay)).png().toBuffer();

  // 3. Compõe: foto + overlay
  let buf = await sharp(baseBuffer)
    .composite([{ input: overlayBuf, blend: 'over' }])
    .png({ compressionLevel: 8 })
    .toBuffer();

  // 4. Aplica logo fixo no canto superior esquerdo
  buf = await applyLogo(buf);

  const outputPath = path.join(outputDir, `arte_${templateKey}_${Date.now()}.png`);
  await fs.promises.writeFile(outputPath, buf);
  return outputPath;
}

module.exports = { generateArt };
