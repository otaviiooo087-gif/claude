'use strict';

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');
const { TEMPLATES }  = require('./templates');
const { applyLogo, hasLogo } = require('./logoOverlay');

const SIZE = 1080;

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  const local  = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0,2)}) ${local.slice(2,7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0,2)}) ${local.slice(2,6)}-${local.slice(6)}`;
  return raw;
}

// Gera o SVG no estilo Grupo ITT: fundo preto, texto dourado, CTA verde
function buildSVG(templateKey, phone) {
  const tmpl = TEMPLATES[templateKey];
  if (!tmpl) throw new Error(`Template desconhecido: ${templateKey}`);

  const { headlineLines, headlineFontSize, subtitle, cta, category } = tmpl;
  const formattedPhone = formatPhone(phone);

  // ── Cálculo dinâmico de posições ──────────────────────────────────
  const LINE_H  = Math.round(headlineFontSize * 1.18); // altura de linha
  const HL_START = 230; // y da primeira baseline do headline

  const lastHeadlineY  = HL_START + (headlineLines.length - 1) * LINE_H;
  const goldBarY       = lastHeadlineY + 38;
  const subtitleStartY = goldBarY + 56;
  const SUBTITLE_LINE_H = 54;
  const lastSubtitleY  = subtitleStartY + (subtitle.length - 1) * SUBTITLE_LINE_H;
  const ctaTop         = lastSubtitleY + 62;
  const ctaH           = 70;
  const dividerY       = ctaTop + ctaH + 68;
  const phoneCircleY   = dividerY + 88;
  const waLinkY        = phoneCircleY + 72;

  // ── SVG dos headlines em ouro ──────────────────────────────────────
  const headlineSVG = headlineLines.map((line, i) => `
  <text x="60" y="${HL_START + i * LINE_H}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="${headlineFontSize}" font-weight="900"
    fill="url(#goldText)">${line}</text>`).join('');

  // ── SVG do subtítulo em branco ─────────────────────────────────────
  const subtitleSVG = subtitle.map((line, i) => `
  <text x="60" y="${subtitleStartY + i * SUBTITLE_LINE_H}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="36" fill="rgba(255,255,255,0.88)">${line}</text>`).join('');

  // ── Área reservada para o logo ─────────────────────────────────────
  const logoPlaceholder = hasLogo()
    ? `<rect x="25" y="25" width="160" height="160" rx="8" fill="rgba(0,0,0,0)"/>`
    : `<rect x="25" y="25" width="220" height="76" rx="12" fill="rgba(197,160,10,0.18)"/>
       <text x="135" y="71" text-anchor="middle"
         font-family="Arial Black, Arial, sans-serif"
         font-size="18" font-weight="900" fill="rgba(245,210,80,0.9)">GRUPO ITT</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <!-- Gradiente do texto dourado -->
    <linearGradient id="goldText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#7A5400"/>
      <stop offset="25%"  stop-color="#D4A017"/>
      <stop offset="55%"  stop-color="#F5D060"/>
      <stop offset="75%"  stop-color="#C8900E"/>
      <stop offset="100%" stop-color="#7A5400"/>
    </linearGradient>
    <!-- Gradiente das bordas douradas -->
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
    <!-- Fundo escuro com leve gradiente quente -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#0A0A0A"/>
      <stop offset="100%" stop-color="#120F04"/>
    </linearGradient>
  </defs>

  <!-- ── Fundo ──────────────────────────────────────────────────── -->
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bgGrad)"/>

  <!-- ── Decoração: círculos dourados sutis (lado direito) ────────── -->
  <circle cx="880" cy="520" r="380"
    fill="none" stroke="rgba(197,148,10,0.10)" stroke-width="2"/>
  <circle cx="880" cy="520" r="280"
    fill="none" stroke="rgba(197,148,10,0.07)" stroke-width="1"/>
  <circle cx="880" cy="520" r="180"
    fill="rgba(197,148,10,0.035)"/>

  <!-- Chevrons decorativos (fundo direito) -->
  <text x="1000" y="480" text-anchor="end"
    font-family="Arial, sans-serif" font-size="220"
    fill="rgba(180,130,0,0.055)" font-weight="900">»</text>

  <!-- ── Bordas douradas ─────────────────────────────────────────── -->
  <!-- Topo -->
  <rect x="0" y="0" width="${SIZE}" height="5" fill="url(#goldBorderH)"/>
  <!-- Base -->
  <rect x="0" y="${SIZE - 5}" width="${SIZE}" height="5" fill="url(#goldBorderH)"/>
  <!-- Esquerda -->
  <rect x="0" y="0" width="4" height="${SIZE}" fill="url(#goldBorderV)"/>

  <!-- ── Logo (placeholder; logo real aplicado pelo logoOverlay) ──── -->
  ${logoPlaceholder}

  <!-- Categoria (canto superior direito) -->
  <text x="${SIZE - 30}" y="48" text-anchor="end"
    font-family="Arial, sans-serif" font-size="15" letter-spacing="2.5"
    fill="rgba(197,164,20,0.65)">${category}</text>

  <!-- ── Headline em dourado ─────────────────────────────────────── -->
  ${headlineSVG}

  <!-- Barra dourada separadora -->
  <rect x="60" y="${goldBarY}" width="140" height="5" rx="2.5"
    fill="url(#goldText)"/>

  <!-- ── Subtítulo em branco ─────────────────────────────────────── -->
  ${subtitleSVG}

  <!-- ── Botão CTA verde ─────────────────────────────────────────── -->
  <rect x="60" y="${ctaTop}" width="460" height="${ctaH}" rx="${ctaH / 2}"
    fill="#25D366"/>
  <!-- Ícone → -->
  <text x="100" y="${ctaTop + 48}"
    font-family="Arial, sans-serif" font-size="32" fill="white">➜</text>
  <text x="295" y="${ctaTop + 48}" text-anchor="middle"
    font-family="Arial, sans-serif" font-size="28" font-weight="bold"
    fill="white">${cta}</text>

  <!-- ── Linha divisória dourada ─────────────────────────────────── -->
  <rect x="0" y="${dividerY}" width="${SIZE}" height="2"
    fill="url(#goldBorderH)" opacity="0.5"/>

  <!-- ── Número de WhatsApp ──────────────────────────────────────── -->
  <!-- Círculo verde com ícone -->
  <circle cx="82" cy="${phoneCircleY}" r="36" fill="#25D366"/>
  <text x="82" y="${phoneCircleY + 14}" text-anchor="middle"
    font-family="Arial, sans-serif" font-size="34" fill="white">✓</text>
  <!-- Número -->
  <text x="142" y="${phoneCircleY + 20}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="64" font-weight="900" fill="white">${formattedPhone}</text>

  <!-- Link wa.me (rodapé sutil) -->
  <text x="${SIZE / 2}" y="${waLinkY}" text-anchor="middle"
    font-family="Arial, sans-serif" font-size="20"
    fill="rgba(255,255,255,0.22)">wa.me/${phone.replace(/\D/g, '')}</text>

</svg>`;
}

async function generateArt(templateKey, phone) {
  const outputDir = path.join(__dirname, '..', 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  const svg = buildSVG(templateKey, phone);

  let buf = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 8 })
    .toBuffer();

  // Aplica logo fixo no canto superior esquerdo
  buf = await applyLogo(buf);

  const outputPath = path.join(outputDir, `arte_${templateKey}_${Date.now()}.png`);
  await fs.promises.writeFile(outputPath, buf);
  return outputPath;
}

module.exports = { generateArt };
