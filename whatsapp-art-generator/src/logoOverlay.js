'use strict';

/**
 * Módulo responsável por aplicar o logo da empresa em TODAS as imagens geradas.
 * Posição e tamanho são fixos — nunca mudam independente do tipo de arte.
 *
 * Posição:  canto superior esquerdo
 * Margens:  25px da borda da imagem
 * Tamanho:  logo redimensionado para caber em 160×160 px (mantém proporção)
 * Fundo:    nenhum — o logo Grupo ITT já tem fundo preto próprio
 */

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const LOGO_FILE = path.join(__dirname, '..', 'assets', 'logo.png');

// ── Constantes fixas — NÃO altere ────────────────────────────────────────────
const EDGE_MARGIN = 25;   // distância do logo até a borda da imagem (px)
const MAX_LOGO_W  = 160;  // largura máxima do logo (px)
const MAX_LOGO_H  = 160;  // altura máxima do logo (px)
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

  // Aplica o logo diretamente — sem fundo branco, pois o logo já tem fundo próprio
  return sharp(imageBuffer)
    .composite([
      {
        input: logoBuffer,
        top:  EDGE_MARGIN,
        left: EDGE_MARGIN,
      },
    ])
    .png()
    .toBuffer();
}

module.exports = { applyLogo, hasLogo, LOGO_FILE };
