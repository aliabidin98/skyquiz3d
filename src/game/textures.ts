import * as THREE from 'three';

/**
 * Creates a high-DPI, crystal clear procedural CanvasTexture for round gates badge
 */
export function createAnswerGateTexture(
  letter: string,
  _text: string,
  variant: 'normal' | 'correct' | 'wrong' = 'normal'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Gradient card background
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (variant === 'correct') {
      grad.addColorStop(0, '#047857');
      grad.addColorStop(1, '#10b981');
    } else if (variant === 'wrong') {
      grad.addColorStop(0, '#b91c1c');
      grad.addColorStop(1, '#ef4444');
    } else {
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.5, '#1e293b');
      grad.addColorStop(1, '#090d16');
    }

    // Pill shaped rounded rectangle
    const r = 36;
    ctx.beginPath();
    ctx.roundRect(16, 16, canvas.width - 32, canvas.height - 32, r);
    ctx.fillStyle = grad;
    ctx.fill();

    // Outer neon glowing border
    ctx.lineWidth = 10;
    if (variant === 'correct') {
      ctx.strokeStyle = '#34d399';
    } else if (variant === 'wrong') {
      ctx.strokeStyle = '#f87171';
    } else {
      ctx.strokeStyle = '#38bdf8';
    }
    ctx.stroke();

    // Inner subtle glow border
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.stroke();

    // Central circular badge for Gate Letter
    const badgeX = canvas.width / 2;
    const badgeY = canvas.height / 2;

    // Small label above letter
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GERBANG PORTAL', badgeX, badgeY - 45);

    // Large bold Letter (A, B, C, D)
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 84px "Plus Jakarta Sans", "Arial Black", sans-serif';
    ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
    ctx.shadowBlur = 12;
    ctx.fillText(letter, badgeX, badgeY + 20);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Creates soft circular particle texture for clouds and vapor trails
 */
export function createGlowParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
