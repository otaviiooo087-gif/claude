const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#1a0a00');
  grad.addColorStop(1, '#0d0d0d');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // Lightning bolt
  ctx.fillStyle = '#ff6b35';
  const s = size * 0.55;
  const ox = (size - s * 0.6) / 2;
  const oy = (size - s) / 2;
  ctx.beginPath();
  ctx.moveTo(ox + s * 0.55, oy);
  ctx.lineTo(ox + s * 0.1, oy + s * 0.5);
  ctx.lineTo(ox + s * 0.45, oy + s * 0.5);
  ctx.lineTo(ox + s * 0.05, oy + s);
  ctx.lineTo(ox + s * 0.6, oy + s * 0.48);
  ctx.lineTo(ox + s * 0.25, oy + s * 0.48);
  ctx.closePath();
  ctx.fill();

  return canvas.toBuffer('image/png');
}

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

sizes.forEach(size => {
  try {
    const buf = generateIcon(size);
    fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buf);
    console.log(`Generated icon${size}.png`);
  } catch (e) {
    console.log(`Skipped icon${size}.png (canvas not available): ${e.message}`);
  }
});
