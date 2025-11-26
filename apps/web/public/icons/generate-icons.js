const fs = require('fs');
const { createCanvas } = require('canvas');

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.18);
  ctx.fill();
  
  // Gradient for sparkle
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#22d3ee');
  gradient.addColorStop(1, '#3b82f6');
  
  // Draw sparkle
  const cx = size / 2;
  const cy = size / 2;
  const s = size * 0.23; // sparkle size
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s * 0.12, cy - s * 0.12);
  ctx.lineTo(cx + s, cy);
  ctx.lineTo(cx + s * 0.12, cy + s * 0.12);
  ctx.lineTo(cx, cy + s);
  ctx.lineTo(cx - s * 0.12, cy + s * 0.12);
  ctx.lineTo(cx - s, cy);
  ctx.lineTo(cx - s * 0.12, cy - s * 0.12);
  ctx.closePath();
  ctx.fill();
  
  // Small sparkles
  ctx.fillStyle = '#22d3ee';
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(cx + size * 0.15, cy - size * 0.15, size * 0.023, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#3b82f6';
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(cx - size * 0.14, cy + size * 0.14, size * 0.015, 0, Math.PI * 2);
  ctx.fill();
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
  console.log(`Generated ${filename}`);
}

try {
  generateIcon(192, 'icon-192x192.png');
  generateIcon(512, 'icon-512x512.png');
  generateIcon(180, 'apple-touch-icon.png');
} catch (e) {
  console.error('Error:', e.message);
}
