'use strict';

/**
 * Módulo responsável por aplicar o logo da empresa em TODAS as imagens geradas.
 * Posição e tamanho são fixos — nunca mudam independente do tipo de arte.
 *
 * Posição:  canto superior esquerdo
 * Margens:  30px da borda da imagem
 * Tamanho:  logo redimensionado para caber em 190×95 px (mantém proporção)
 * Fundo:    retângulo branco arredondado com 14px de padding interno
 */

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const LOGO_FILE = path.join(__dirname, '..', 'assets', 'logo.png');

// ── Constantes fixas — NÃO altere ────────────────────────────────────────────
const EDGE_MARGIN = 30;   // distância do logo até a borda da imagem (px)
const MAX_LOGO_W  = 190;  // largura máxima do logo (px)
const MAX_LOGO_H  = 95;   // altura máxima do logo (px)
const BG_PADDING  = 14;   // padding interno do fundo branco (px)
const BG_RADIUS   = 14;   // arredondamento do fundo branco (px)
// ─────────────────────────────────────────────────────────────────────────────

function hasLogo() {
  return fs.existsSync(LOGO_FILE);
}

/**
 * Recebe um Buffer de imagem PNG e devolve o mesmo Buffer
 * com o logo da empresa sobreposto no canto superior esquerdo.
 * Se o arquivo assets/logo.png não existir, devolve o buffer original intacto.
 *
 * @param {Buffer} imageBuffer
 * @returns {Promise<Buffer>}
 */
async function applyLogo(imageBuffer) {
  if (!hasLogo()) return imageBuffer;

  // Redimensiona o logo para caber em MAX_LOGO_W × MAX_LOGO_H mantendo proporção
  const logoBuffer = await sharp(LOGO_FILE)
    .resize(MAX_LOGO_W, MAX_LOGO_H, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  const { width: logoW, height: logoH } = await sharp(logoBuffer).metadata();

  const bgW = logoW + BG_PADDING * 2;
  const bgH = logoH + BG_PADDING * 2;

  // Fundo branco arredondado (visível sobre qualquer cor de background)
  const bgSvg = `<svg width="${bgW}" height="${bgH}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${bgW}" height="${bgH}" rx="${BG_RADIUS}" ry="${BG_RADIUS}"
      fill="rgba(255,255,255,0.95)"/>
  </svg>`;

  return sharp(imageBuffer)
    .composite([
      // 1º: fundo branco
      {
        input: Buffer.from(bgSvg),
        top:  EDGE_MARGIN,
        left: EDGE_MARGIN,
      },
      // 2º: logo centralizado dentro do fundo
      {
        input: logoBuffer,
        top:  EDGE_MARGIN + BG_PADDING,
        left: EDGE_MARGIN + BG_PADDING,
      },
    ])
    .png()
    .toBuffer();
}

module.exports = { applyLogo, hasLogo, LOGO_FILE };
