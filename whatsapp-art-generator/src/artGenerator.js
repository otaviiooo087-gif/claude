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

function drawIconShape(type, cx, cy) {
  switch (type) {
    case 'lock': return `
      <rect x="${cx-13}" y="${cy-1}" width="26" height="18" rx="3" fill="none" stroke="#F0C030" stroke-width="2.5"/>
      <path d="M${cx-8} ${cy-1} a8 9 0 0 1 16 0" fill="none" stroke="#F0C030" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy+8}" r="2.5" fill="#F0C030"/>`;
    case 'chart-down': return `
      <polyline points="${cx-16},${cy-10} ${cx-5},${cy+2} ${cx+3},${cy-6} ${cx+16},${cy+10}"
        stroke="#F0C030" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="${cx+8},${cy+10} ${cx+16},${cy+10} ${cx+16},${cy+2}"
        stroke="#F0C030" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    case 'card': return `
      <rect x="${cx-17}" y="${cy-11}" width="34" height="22" rx="3" fill="none" stroke="#F0C030" stroke-width="2.2"/>
      <rect x="${cx-17}" y="${cy-4}" width="34" height="7" fill="#F0C030" opacity="0.45"/>
      <rect x="${cx-12}" y="${cy+5}" width="9" height="3" rx="1" fill="#F0C030" opacity="0.7"/>`;
    case 'percent': return `
      <text x="${cx}" y="${cy+11}" text-anchor="middle"
        font-family="Arial Black,Arial" font-size="28" font-weight="900" fill="#F0C030">%</text>`;
    case 'arrow-up': return `
      <line x1="${cx}" y1="${cy+13}" x2="${cx}" y2="${cy-12}"
        stroke="#F0C030" stroke-width="2.8" stroke-linecap="round"/>
      <polyline points="${cx-10},${cy-3} ${cx},${cy-13} ${cx+10},${cy-3}"
        stroke="#F0C030" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'check': return `
      <polyline points="${cx-14},${cy+1} ${cx-4},${cy+12} ${cx+14},${cy-11}"
        stroke="#F0C030" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'money': return `
      <text x="${cx}" y="${cy+10}" text-anchor="middle"
        font-family="Arial Black,Arial" font-size="22" font-weight="900" fill="#F0C030">R$</text>`;
    case 'bank': return `
      <polygon points="${cx},${cy-17} ${cx+17},${cy-7} ${cx-17},${cy-7}"
        fill="none" stroke="#F0C030" stroke-width="2"/>
      <rect x="${cx-12}" y="${cy-6}" width="4" height="13" fill="#F0C030" opacity="0.75"/>
      <rect x="${cx-2}" y="${cy-6}" width="4" height="13" fill="#F0C030" opacity="0.75"/>
      <rect x="${cx+8}" y="${cy-6}" width="4" height="13" fill="#F0C030" opacity="0.75"/>
      <rect x="${cx-14}" y="${cy+7}" width="28" height="3.5" rx="1" fill="#F0C030" opacity="0.75"/>`;
    case 'star': return `
      <text x="${cx}" y="${cy+11}" text-anchor="middle"
        font-family="Arial" font-size="30" fill="#F0C030">&#9733;</text>`;
    case 'calendar': return `
      <rect x="${cx-14}" y="${cy-10}" width="28" height="21" rx="2"
        fill="none" stroke="#F0C030" stroke-width="2"/>
      <line x1="${cx-14}" y1="${cy-3}" x2="${cx+14}" y2="${cy-3}" stroke="#F0C030" stroke-width="2"/>
      <line x1="${cx-7}" y1="${cy-14}" x2="${cx-7}" y2="${cy-8}" stroke="#F0C030" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="${cx+7}" y1="${cy-14}" x2="${cx+7}" y2="${cy-8}" stroke="#F0C030" stroke-width="2.5" stroke-linecap="round"/>`;
    default: return '';
  }
}

function buildIconsSVG(icons, centerY) {
  if (!icons || icons.length === 0) return '';

  const sectionW = SIZE / icons.length;
  const ICON_R   = 42;

  return icons.map((icon, i) => {
    const cx = Math.round(sectionW * i + sectionW / 2);

    const circle  = `<circle cx="${cx}" cy="${centerY}" r="${ICON_R}" fill="rgba(160,115,5,0.13)" stroke="#B08010" stroke-width="1.5"/>`;
    const shape   = drawIconShape(icon.type, cx, centerY);
    const label1  = `<text x="${cx}" y="${centerY + ICON_R + 22}" text-anchor="middle"
      font-family="Arial,sans-serif" font-size="18" font-weight="bold"
      fill="rgba(255,255,255,0.82)">${icon.labels[0]}</text>`;
    const label2  = icon.labels[1]
      ? `<text x="${cx}" y="${centerY + ICON_R + 42}" text-anchor="middle"
        font-family="Arial,sans-serif" font-size="18" font-weight="bold"
        fill="rgba(255,255,255,0.82)">${icon.labels[1]}</text>`
      : '';
    const divider = i < icons.length - 1
      ? `<line x1="${cx + Math.round(sectionW/2)}" y1="${centerY - ICON_R + 8}"
          x2="${cx + Math.round(sectionW/2)}" y2="${centerY + ICON_R - 8}"
          stroke="rgba(180,130,10,0.35)" stroke-width="1"/>`
      : '';

    return circle + shape + label1 + label2 + divider;
  }).join('');
}

function buildOverlaySVG(templateKey, phone) {
  const tmpl = TEMPLATES[templateKey];
  if (!tmpl) throw new Error(`Template desconhecido: ${templateKey}`);

  const { headlineLines, headlineFontSize, subtitle, cta, category, icons } = tmpl;
  const formattedPhone = formatPhone(phone);

  const FS             = headlineFontSize;
  const LINE_H         = Math.round(FS * 1.15);
  const HL_START       = 185;
  const lastHLY        = HL_START + (headlineLines.length - 1) * LINE_H;

  const goldBarY       = lastHLY + 44;
  const subStart       = goldBarY + 52;
  const SUBTITLE_LH    = 48;
  const lastSubY       = subStart + (subtitle.length - 1) * SUBTITLE_LH;
  const subBarH        = (subtitle.length - 1) * SUBTITLE_LH + 42;

  const ICON_R         = 42;
  const iconCenterY    = Math.max(lastSubY + 95, 680);
  const dividerY       = iconCenterY + ICON_R + 58;
  const ctaTop         = dividerY + 18;
  const ctaH           = 112;
  const ctaCenterY     = ctaTop + Math.round(ctaH / 2);

  const headlineSVG = headlineLines.map((line, i) => `
  <text x="55" y="${HL_START + i * LINE_H}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="${FS}" font-weight="900"
    fill="url(#goldText)">${line}</text>`).join('');

  const subtitleSVG = subtitle.map((line, i) => `
  <text x="78" y="${subStart + 8 + i * SUBTITLE_LH}"
    font-family="Arial, sans-serif" font-size="33"
    fill="rgba(255,255,255,0.90)">${line}</text>`).join('');

  const iconsSVG = buildIconsSVG(icons, iconCenterY);

  const logoPlaceholder = hasLogo()
    ? `<rect x="25" y="25" width="160" height="100" rx="6" fill="rgba(0,0,0,0)"/>`
    : `<rect x="25" y="25" width="210" height="68" rx="10" fill="rgba(0,0,0,0.60)"/>
       <text x="130" y="66" text-anchor="middle"
         font-family="Arial Black, Arial, sans-serif"
         font-size="16" font-weight="900" fill="rgba(245,208,70,0.92)">GRUPO ITT RDZ</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}"
  xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#7A5400"/>
      <stop offset="25%"  stop-color="#D4A017"/>
      <stop offset="55%"  stop-color="#F5D060"/>
      <stop offset="75%"  stop-color="#C8900E"/>
      <stop offset="100%" stop-color="#7A5400"/>
    </linearGradient>
    <linearGradient id="darkLeft" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="rgba(4,4,4,0.97)"/>
      <stop offset="45%"  stop-color="rgba(4,4,4,0.85)"/>
      <stop offset="68%"  stop-color="rgba(4,4,4,0.52)"/>
      <stop offset="100%" stop-color="rgba(4,4,4,0.10)"/>
    </linearGradient>
    <linearGradient id="darkBottom" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="rgba(4,4,4,0.0)"/>
      <stop offset="45%"  stop-color="rgba(4,4,4,0.88)"/>
      <stop offset="100%" stop-color="rgba(4,4,4,0.98)"/>
    </linearGradient>
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

  <!-- Overlay lateral escuro -->
  <rect width="${SIZE}" height="${SIZE}" fill="url(#darkLeft)"/>

  <!-- Overlay escuro inferior -->
  <rect y="${iconCenterY - ICON_R - 60}" width="${SIZE}"
    height="${SIZE - (iconCenterY - ICON_R - 60)}" fill="url(#darkBottom)"/>

  <!-- Bordas douradas -->
  <rect x="0" y="0" width="${SIZE}" height="5" fill="url(#goldBorderH)"/>
  <rect x="0" y="${SIZE-5}" width="${SIZE}" height="5" fill="url(#goldBorderH)"/>
  <rect x="0" y="0" width="4" height="${SIZE}" fill="url(#goldBorderV)"/>

  <!-- Logo -->
  ${logoPlaceholder}

  <!-- Categoria -->
  <text x="${SIZE-30}" y="50" text-anchor="end"
    font-family="Arial, sans-serif" font-size="14" letter-spacing="2.5"
    fill="rgba(197,164,20,0.72)">${category}</text>

  <!-- Headline dourado -->
  ${headlineSVG}

  <!-- Barra dourada separadora -->
  <rect x="55" y="${goldBarY}" width="130" height="4" rx="2" fill="url(#goldText)"/>

  <!-- Barra lateral subtítulo -->
  <rect x="55" y="${subStart - 6}" width="3" height="${subBarH}" rx="1.5"
    fill="url(#goldText)" opacity="0.7"/>

  <!-- Subtítulo -->
  ${subtitleSVG}

  <!-- Ícones -->
  ${iconsSVG}

  <!-- Linha divisória dourada -->
  <rect x="0" y="${dividerY}" width="${SIZE}" height="1.5"
    fill="url(#goldBorderH)" opacity="0.5"/>

  <!-- CTA: fundo escuro premium com número -->
  <rect x="38" y="${ctaTop}" width="${SIZE - 76}" height="${ctaH}" rx="20"
    fill="rgba(8,8,8,0.94)" stroke="rgba(180,130,10,0.30)" stroke-width="1"/>

  <!-- WhatsApp circle -->
  <circle cx="106" cy="${ctaCenterY}" r="36" fill="#25D366"/>
  <text x="106" y="${ctaCenterY + 13}" text-anchor="middle"
    font-family="Arial, sans-serif" font-size="30" fill="white">&#10003;</text>

  <!-- Label CTA -->
  <text x="165" y="${ctaCenterY - 14}"
    font-family="Arial, sans-serif" font-size="22"
    fill="rgba(255,255,255,0.60)">${cta}</text>

  <!-- Número de telefone -->
  <text x="165" y="${ctaCenterY + 34}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="48" font-weight="900" fill="white">${formattedPhone}</text>
</svg>`;
}

async function generateArt(templateKey, phone) {
  const outputDir = path.join(__dirname, '..', 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  const bgPath = await ensureBackground(templateKey);

  let baseBuffer;
  if (bgPath) {
    baseBuffer = await sharp(bgPath)
      .resize(SIZE, SIZE, { fit: 'cover', position: 'right' })
      .png()
      .toBuffer();
  } else {
    const fallback = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${SIZE}" height="${SIZE}" fill="#080808"/>
    </svg>`;
    baseBuffer = await sharp(Buffer.from(fallback)).png().toBuffer();
  }

  const svgOverlay = buildOverlaySVG(templateKey, phone);
  const overlayBuf = await sharp(Buffer.from(svgOverlay)).png().toBuffer();

  let buf = await sharp(baseBuffer)
    .composite([{ input: overlayBuf, blend: 'over' }])
    .png({ compressionLevel: 8 })
    .toBuffer();

  buf = await applyLogo(buf);

  const outputPath = path.join(outputDir, `arte_${templateKey}_${Date.now()}.png`);
  await fs.promises.writeFile(outputPath, buf);
  return outputPath;
}

module.exports = { generateArt };
