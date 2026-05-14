'use strict';

const sharp  = require('sharp');
const fs     = require('fs');
const path   = require('path');
const { TEMPLATES }          = require('./templates');
const { applyLogo, hasLogo } = require('./logoOverlay');
const { ensureBackground }   = require('./backgroundManager');

const W = 1080;
const H = 1350;

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

  const sectionW = W / icons.length;
  const ICON_R   = 44;

  return icons.map((icon, i) => {
    const cx = Math.round(sectionW * i + sectionW / 2);

    const circle  = `<circle cx="${cx}" cy="${centerY}" r="${ICON_R}" fill="rgba(160,115,5,0.15)" stroke="rgba(200,155,20,0.50)" stroke-width="1.5"/>`;
    const shape   = drawIconShape(icon.type, cx, centerY);
    const label1  = `<text x="${cx}" y="${centerY + ICON_R + 24}" text-anchor="middle"
      font-family="Arial,sans-serif" font-size="19" font-weight="bold" letter-spacing="0.5"
      fill="rgba(255,255,255,0.85)">${icon.labels[0]}</text>`;
    const label2  = icon.labels[1]
      ? `<text x="${cx}" y="${centerY + ICON_R + 46}" text-anchor="middle"
        font-family="Arial,sans-serif" font-size="19" font-weight="bold" letter-spacing="0.5"
        fill="rgba(255,255,255,0.85)">${icon.labels[1]}</text>`
      : '';
    const divider = i < icons.length - 1
      ? `<line x1="${cx + Math.round(sectionW/2)}" y1="${centerY - ICON_R + 10}"
          x2="${cx + Math.round(sectionW/2)}" y2="${centerY + ICON_R - 10}"
          stroke="rgba(200,155,20,0.30)" stroke-width="1"/>`
      : '';

    return circle + shape + label1 + label2 + divider;
  }).join('');
}

function buildOverlaySVG(templateKey, phone) {
  const tmpl = TEMPLATES[templateKey];
  if (!tmpl) throw new Error(`Template desconhecido: ${templateKey}`);

  const { headlineLines, headlineFontSize, subtitle, cta, category, icons } = tmpl;
  const formattedPhone = formatPhone(phone);

  const FS        = headlineFontSize;
  const LINE_H    = Math.round(FS * 1.18);
  const HL_START  = 240;
  const lastHLY   = HL_START + (headlineLines.length - 1) * LINE_H;

  const goldBarY    = lastHLY + 50;
  const subStart    = goldBarY + 58;
  const SUBTITLE_LH = 50;
  const lastSubY    = subStart + (subtitle.length - 1) * SUBTITLE_LH;
  const subBarH     = (subtitle.length - 1) * SUBTITLE_LH + 46;

  const ICON_R      = 44;
  const iconCenterY = Math.max(lastSubY + 110, 950);
  const dividerY    = iconCenterY + ICON_R + 62;
  const ctaTop      = dividerY + 22;
  const ctaH        = 150;
  const ctaCenterY  = ctaTop + Math.round(ctaH / 2);

  const headlineSVG = headlineLines.map((line, i) => `
  <text x="55" y="${HL_START + i * LINE_H}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="${FS}" font-weight="900" letter-spacing="-0.5"
    fill="url(#goldText)">${line}</text>`).join('');

  const subtitleSVG = subtitle.map((line, i) => `
  <text x="80" y="${subStart + 10 + i * SUBTITLE_LH}"
    font-family="Arial, sans-serif" font-size="34" letter-spacing="0.3"
    fill="rgba(255,255,255,0.88)">${line}</text>`).join('');

  const iconsSVG = buildIconsSVG(icons, iconCenterY);

  const logoPlaceholder = hasLogo()
    ? `<rect x="25" y="25" width="160" height="100" rx="6" fill="rgba(0,0,0,0)"/>`
    : `<rect x="25" y="25" width="220" height="72" rx="10" fill="rgba(0,0,0,0.65)"/>
       <text x="135" y="68" text-anchor="middle"
         font-family="Arial Black, Arial, sans-serif"
         font-size="17" font-weight="900" fill="rgba(245,208,70,0.92)">GRUPO ITT RDZ</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
  xmlns="http://www.w3.org/2000/svg">
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
      <stop offset="40%"  stop-color="rgba(3,3,3,0.90)"/>
      <stop offset="65%"  stop-color="rgba(3,3,3,0.58)"/>
      <stop offset="100%" stop-color="rgba(3,3,3,0.12)"/>
    </linearGradient>
    <linearGradient id="darkBottom" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="rgba(3,3,3,0.0)"/>
      <stop offset="35%"  stop-color="rgba(3,3,3,0.82)"/>
      <stop offset="100%" stop-color="rgba(3,3,3,0.99)"/>
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
    <linearGradient id="ctaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="rgba(10,10,10,0.97)"/>
      <stop offset="100%" stop-color="rgba(5,5,5,0.99)"/>
    </linearGradient>
  </defs>

  <!-- Overlay lateral escuro -->
  <rect width="${W}" height="${H}" fill="url(#darkLeft)"/>

  <!-- Overlay escuro inferior -->
  <rect y="${iconCenterY - ICON_R - 70}" width="${W}"
    height="${H - (iconCenterY - ICON_R - 70)}" fill="url(#darkBottom)"/>

  <!-- Bordas douradas (4 lados) -->
  <rect x="0" y="0" width="${W}" height="5" fill="url(#goldBorderH)"/>
  <rect x="0" y="${H-5}" width="${W}" height="5" fill="url(#goldBorderH)"/>
  <rect x="0" y="0" width="4" height="${H}" fill="url(#goldBorderV)"/>
  <rect x="${W-4}" y="0" width="4" height="${H}" fill="url(#goldBorderV)"/>

  <!-- Logo -->
  ${logoPlaceholder}

  <!-- Categoria -->
  <text x="${W-35}" y="52" text-anchor="end"
    font-family="Arial, sans-serif" font-size="15" letter-spacing="3"
    fill="rgba(200,164,22,0.75)">${category}</text>

  <!-- Linha decorativa sob categoria -->
  <rect x="${W-220}" y="62" width="185" height="1" rx="0.5"
    fill="rgba(200,164,22,0.25)"/>

  <!-- Headline dourado -->
  ${headlineSVG}

  <!-- Barra dourada separadora -->
  <rect x="55" y="${goldBarY}" width="150" height="4" rx="2" fill="url(#goldAccent)"/>

  <!-- Barra lateral subtítulo -->
  <rect x="55" y="${subStart - 6}" width="3" height="${subBarH}" rx="1.5"
    fill="url(#goldAccent)" opacity="0.75"/>

  <!-- Subtítulo -->
  ${subtitleSVG}

  <!-- Ícones -->
  ${iconsSVG}

  <!-- Linha divisória dourada -->
  <rect x="0" y="${dividerY}" width="${W}" height="1.5"
    fill="url(#goldBorderH)" opacity="0.55"/>

  <!-- CTA: fundo escuro premium -->
  <rect x="32" y="${ctaTop}" width="${W - 64}" height="${ctaH}" rx="22"
    fill="url(#ctaGrad)" stroke="rgba(200,155,20,0.35)" stroke-width="1.5"/>

  <!-- WhatsApp circle -->
  <circle cx="112" cy="${ctaCenterY}" r="42" fill="#1DA851"/>
  <circle cx="112" cy="${ctaCenterY}" r="38" fill="#25D366"/>
  <text x="112" y="${ctaCenterY + 14}" text-anchor="middle"
    font-family="Arial, sans-serif" font-size="34" fill="white">&#10003;</text>

  <!-- Separador vertical interno -->
  <rect x="172" y="${ctaTop + 28}" width="1.5" height="${ctaH - 56}" rx="0.75"
    fill="rgba(200,155,20,0.30)"/>

  <!-- Label CTA -->
  <text x="196" y="${ctaCenterY - 18}"
    font-family="Arial, sans-serif" font-size="22" letter-spacing="0.5"
    fill="rgba(255,255,255,0.55)">${cta}</text>

  <!-- Número de telefone -->
  <text x="196" y="${ctaCenterY + 38}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="50" font-weight="900" letter-spacing="-1"
    fill="white">${formattedPhone}</text>
</svg>`;
}

async function generateArt(templateKey, phone) {
  const outputDir = path.join(__dirname, '..', 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  const bgPath = await ensureBackground(templateKey);

  let baseBuffer;
  if (bgPath) {
    baseBuffer = await sharp(bgPath)
      .resize(W, H, { fit: 'cover', position: 'right' })
      .png()
      .toBuffer();
  } else {
    const fallback = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="#060606"/>
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
