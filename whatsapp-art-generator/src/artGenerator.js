'use strict';

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { TEMPLATES } = require('./templates');
const { applyLogo, hasLogo } = require('./logoOverlay');

const SIZE = 1080;

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith('55') && digits.length > 11
    ? digits.slice(2)
    : digits;

  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return raw;
}

function buildLogoSection() {
  if (hasLogo()) {
    // Área reservada 160×160 px — logo sobreposto depois pelo logoOverlay
    return `<rect x="25" y="25" width="160" height="160" rx="8"
      fill="rgba(0,0,0,0.0)"/>`;
  }
  // Sem logo: exibe nome da empresa em texto
  const company = process.env.COMPANY_NAME || 'SUA EMPRESA';
  return `
    <rect x="25" y="25" width="210" height="72" rx="14"
      fill="rgba(255,255,255,0.20)"/>
    <text x="130" y="69" text-anchor="middle"
      font-family="Arial Black, Arial, sans-serif"
      font-size="17" font-weight="900" fill="white">${company}</text>
  `;
}

function buildSVG(templateKey, phone) {
  const tmpl = TEMPLATES[templateKey];
  if (!tmpl) throw new Error(`Template desconhecido: ${templateKey}`);

  const formattedPhone = formatPhone(phone);
  const { gradient, glowColor, accent, iconPath, line1, line2, subtitle, category } = tmpl;
  const logoSection = buildLogoSection();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="${gradient.from}"/>
      <stop offset="100%" stop-color="${gradient.to}"/>
    </linearGradient>
    <linearGradient id="bottomPanel" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="rgba(0,0,0,0.35)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.65)"/>
    </linearGradient>
    <linearGradient id="titleBand" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="rgba(255,255,255,0.0)"/>
      <stop offset="20%"  stop-color="rgba(255,255,255,0.12)"/>
      <stop offset="80%"  stop-color="rgba(255,255,255,0.12)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.0)"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>

  <!-- Decorative circles -->
  <circle cx="980" cy="140" r="320" fill="${glowColor}"/>
  <circle cx="100" cy="980" r="380" fill="${glowColor}"/>

  <!-- Diagonal stripe decoration -->
  <rect x="-200" y="590" width="1500" height="7"
    fill="rgba(255,255,255,0.08)" transform="rotate(-12 540 540)"/>
  <rect x="-200" y="608" width="1500" height="3"
    fill="rgba(255,255,255,0.05)" transform="rotate(-12 540 540)"/>

  <!-- Header -->
  ${logoSection}

  <!-- Category chip -->
  <rect x="${SIZE - 220}" y="36" width="184" height="38" rx="19"
    fill="rgba(255,255,255,0.18)"/>
  <text x="${SIZE - 128}" y="61" text-anchor="middle"
    font-family="Arial, sans-serif" font-size="14" font-weight="bold"
    fill="white" letter-spacing="1">${category}</text>

  <!-- Separator line under header -->
  <line x1="36" y1="118" x2="${SIZE - 36}" y2="118"
    stroke="rgba(255,255,255,0.12)" stroke-width="1"/>

  <!-- Icon -->
  ${iconPath}

  <!-- Title band -->
  <rect x="60" y="415" width="${SIZE - 120}" height="170" rx="16"
    fill="url(#titleBand)"/>

  <!-- Title line 1 -->
  <text x="${SIZE / 2}" y="487" text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif"
    font-size="82" font-weight="900" fill="white" letter-spacing="3">${line1}</text>

  <!-- Title line 2 -->
  <text x="${SIZE / 2}" y="572" text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif"
    font-size="82" font-weight="900" fill="${accent}" letter-spacing="3">${line2}</text>

  <!-- Accent bar -->
  <rect x="240" y="598" width="${SIZE - 480}" height="5" rx="2.5"
    fill="${accent}" opacity="0.75"/>

  <!-- Subtitle -->
  <text x="${SIZE / 2}" y="648" text-anchor="middle"
    font-family="Arial, sans-serif" font-size="30" fill="rgba(255,255,255,0.88)">${subtitle}</text>

  <!-- Bottom panel -->
  <rect y="688" width="${SIZE}" height="392" fill="url(#bottomPanel)"/>

  <!-- Separator -->
  <line x1="0" y1="688" x2="${SIZE}" y2="688"
    stroke="${accent}" stroke-width="3" opacity="0.6"/>

  <!-- Contact label -->
  <text x="${SIZE / 2}" y="768" text-anchor="middle"
    font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.60)"
    letter-spacing="4">ENTRE EM CONTATO PELO WHATSAPP</text>

  <!-- Phone number -->
  <text x="${SIZE / 2}" y="890" text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif"
    font-size="80" font-weight="900" fill="white">${formattedPhone}</text>

  <!-- WhatsApp badge -->
  <rect x="${SIZE / 2 - 185}" y="930" width="370" height="58" rx="29"
    fill="#25D366"/>
  <circle cx="${SIZE / 2 - 148}" cy="959" r="14" fill="white"/>
  <circle cx="${SIZE / 2 - 148}" cy="959" r="10" fill="#25D366"/>
  <text x="${SIZE / 2 - 132}" y="966" text-anchor="start"
    font-family="Arial, sans-serif" font-size="26" font-weight="bold"
    fill="white">WhatsApp</text>

  <!-- Bottom margin text -->
  <text x="${SIZE / 2}" y="1052" text-anchor="middle"
    font-family="Arial, sans-serif" font-size="18"
    fill="rgba(255,255,255,0.30)">wa.me/${phone.replace(/\D/g, '')}</text>
</svg>`;
}

async function generateArt(templateKey, phone) {
  const outputDir = path.join(__dirname, '..', 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  const svg = buildSVG(templateKey, phone);

  // 1. SVG → PNG buffer
  let buf = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 8 })
    .toBuffer();

  // 2. Aplica logo fixo no canto superior esquerdo (mesmo padrão em todas as artes)
  buf = await applyLogo(buf);

  const outputPath = path.join(outputDir, `arte_${templateKey}_${Date.now()}.png`);
  await fs.promises.writeFile(outputPath, buf);
  return outputPath;
}

module.exports = { generateArt };
