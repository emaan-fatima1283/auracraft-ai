import {
  BeamState,
  ComboOrbState,
  FINGERTIP_INDICES,
  HAND_CONNECTIONS,
  Particle,
  Point2D,
  RGBColor,
  ShieldState,
  VFXConfig,
  getPalmCenter,
} from './engine';

function rgbStr(color: RGBColor, alpha = 1.0): string {
  const r = Math.min(255, Math.max(0, Math.round(color[0])));
  const g = Math.min(255, Math.max(0, Math.round(color[1])));
  const b = Math.min(255, Math.max(0, Math.round(color[2])));
  const a = Math.min(1.0, Math.max(0.0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

/**
 * Draws the simulated dark studio camera backdrop when no physical webcam is active
 */
export function drawStudioBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  landmarksList: ReadonlyArray<ReadonlyArray<Point2D>> | null,
  time: number
) {
  ctx.save();
  // Deep studio optical background
  const bgGrad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.48,
    60,
    width * 0.5,
    height * 0.5,
    width * 0.75
  );
  bgGrad.addColorStop(0, '#131624');
  bgGrad.addColorStop(0.55, '#0b0d17');
  bgGrad.addColorStop(1, '#05060b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Perspective tracking grid
  ctx.strokeStyle = 'rgba(100, 140, 255, 0.045)';
  ctx.lineWidth = 1;
  const gridSize = 64;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Soft anatomical hand silhouettes behind the neon wireframe so simulated hands read clearly
  if (landmarksList && landmarksList.length > 0) {
    for (const landmarks of landmarksList) {
      if (landmarks.length < 21) continue;
      const [px, py] = getPalmCenter(landmarks);
      const ambientGrad = ctx.createRadialGradient(px, py, 10, px, py, 170);
      ambientGrad.addColorStop(0, 'rgba(35, 48, 85, 0.42)');
      ambientGrad.addColorStop(1, 'rgba(10, 12, 22, 0)');
      ctx.fillStyle = ambientGrad;
      ctx.beginPath();
      ctx.arc(px, py, 170, 0, Math.PI * 2);
      ctx.fill();

      // Soft palm polygon
      ctx.fillStyle = 'rgba(26, 33, 52, 0.65)';
      ctx.beginPath();
      const palmHull = [0, 1, 2, 5, 9, 13, 17];
      ctx.moveTo(landmarks[0][0], landmarks[0][1]);
      for (const idx of palmHull) {
        ctx.lineTo(landmarks[idx][0], landmarks[idx][1]);
      }
      ctx.closePath();
      ctx.fill();

      // Soft flesh-volume capsules along fingers
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(30, 38, 60, 0.62)';
      ctx.lineWidth = 22;
      for (const [c0, c1] of HAND_CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(landmarks[c0][0], landmarks[c0][1]);
        ctx.lineTo(landmarks[c1][0], landmarks[c1][1]);
        ctx.stroke();
      }
    }
  }

  // Subtle scanline shimmer
  const scanY = ((time * 90) % (height + 80)) - 40;
  const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
  scanGrad.addColorStop(0, 'rgba(0, 255, 255, 0)');
  scanGrad.addColorStop(0.5, 'rgba(0, 255, 255, 0.025)');
  scanGrad.addColorStop(1, 'rgba(0, 255, 255, 0)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(0, scanY - 30, width, 60);

  ctx.restore();
}

/**
 * Neon Hand Skeleton with intense bloom glow (shadowBlur = 24)
 */
export function drawHandSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: ReadonlyArray<Point2D>,
  color: RGBColor,
  config: VFXConfig
) {
  if (!config.enableSkeleton || landmarks.length < 21) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Heavy cinematic neon bloom glow
  ctx.shadowBlur = 24;
  ctx.shadowColor = rgbStr(color, 0.9);

  const n = Math.max(1, Math.round(config.glowIntensity));
  const baseThickness = config.lineThickness;

  for (let i = n; i >= 1; i--) {
    const thickness = baseThickness + (i - 1) * 2.5;
    let alpha = config.skeletonGlowAlpha * (1.0 - (i - 1) / n);
    alpha = Math.max(0.0, Math.min(1.0, alpha));
    if (i === 1) {
      alpha = 0.95;
    }

    ctx.strokeStyle = rgbStr(color, alpha);
    ctx.lineWidth = thickness;

    ctx.beginPath();
    for (const [c0, c1] of HAND_CONNECTIONS) {
      if (c0 < landmarks.length && c1 < landmarks.length) {
        ctx.moveTo(landmarks[c0][0], landmarks[c0][1]);
        ctx.lineTo(landmarks[c1][0], landmarks[c1][1]);
      }
    }
    ctx.stroke();
  }

  // Intense glowing joints
  for (let idx = 0; idx < landmarks.length; idx++) {
    const [x, y] = landmarks[idx];
    const isTip = (FINGERTIP_INDICES as readonly number[]).includes(idx);
    const radius = isTip ? 5.0 : 3.0;
    ctx.fillStyle = isTip ? 'rgba(255, 255, 255, 0.98)' : rgbStr(color, 0.85);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Hand Palm Aura with heavy neon bloom
 */
export function drawHandAura(
  ctx: CanvasRenderingContext2D,
  landmarks: ReadonlyArray<Point2D>,
  color: RGBColor,
  pulseTime: number,
  config: VFXConfig
) {
  if (!config.enableAura || landmarks.length < 21) return;

  const [palmX, palmY] = getPalmCenter(landmarks);
  const pulse = Math.sin(pulseTime * config.pulseSpeed) * 0.15 + 1.0;
  const baseRadius = Math.round(35 * pulse);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.5;

  // Heavy neon glow
  ctx.shadowBlur = 26;
  ctx.shadowColor = rgbStr(color, 0.95);

  const numRings = 5;
  for (let i = 0; i < numRings; i++) {
    const radius = baseRadius + i * 9;
    const alpha = Math.min(1.0, config.auraAlpha * 3.4 * (1.0 - i / numRings));
    ctx.strokeStyle = rgbStr(color, alpha);
    ctx.beginPath();
    ctx.arc(palmX, palmY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Dynamic magic dust particles with trailing spark physics and heavy bloom
 */
export function drawParticleTrails(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  config: VFXConfig
) {
  if (!config.enableParticles || particles.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  // Set shadow properties once for the whole particle batch to prevent GPU pipeline thrashing
  ctx.shadowBlur = 18;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.alpha <= 0.02) continue;

    const twinkle = 0.85 + Math.sin(p.sparklePhase) * 0.15;
    const effAlpha = Math.min(1.0, p.alpha * twinkle);
    const effSize = Math.max(1, p.size * (0.4 + 0.6 * (p.life / p.maxLife)));
    const colorStr = rgbStr(p.color, effAlpha * 0.9);
    ctx.shadowColor = colorStr;

    if (p.isBurstSpark) {
      // High-speed trailing spark streak
      ctx.lineWidth = Math.max(1.5, effSize * 0.85);
      ctx.strokeStyle = colorStr;
      ctx.beginPath();
      ctx.moveTo(p.prevX, p.prevY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      // Bright spark head
      ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1.2, effSize * 0.6), 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Glowing spark center
      ctx.fillStyle = colorStr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, effSize, 0, Math.PI * 2);
      ctx.fill();

      // Pure white pinpoint core
      if (effAlpha > 0.4) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(effAlpha * 0.95).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.6, effSize * 0.35), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

/**
 * Fingertip Neon Energy Beams with heavy bloom passes
 */
export function drawBeamEffect(
  ctx: CanvasRenderingContext2D,
  beamState: BeamState,
  config: VFXConfig
) {
  if (!config.enableBeam || beamState.beamAlpha <= 0.01) return;
  const { hand1Landmarks: hand1, hand2Landmarks: hand2 } = beamState;
  if (!hand1 || !hand2) return;

  const fingerColors: Record<number, RGBColor> = {
    4: config.colors.thumbLine,
    8: config.colors.indexLine,
    12: config.colors.middleLine,
    16: config.colors.ringLine,
    20: config.colors.pinkyLine,
  };

  const glowPasses: ReadonlyArray<[number, number]> = [
    [45, 0.08],
    [30, 0.16],
    [18, 0.28],
    [10, 0.50],
    [5, 0.85],
    [2, 1.00],
  ];

  const effectiveAlpha = config.beamBlendAlpha * beamState.beamAlpha;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';

  for (const idx of FINGERTIP_INDICES) {
    if (idx < hand1.length && idx < hand2.length) {
      const pt1 = hand1[idx];
      const pt2 = hand2[idx];
      const color = fingerColors[idx] ?? config.colors.beamCore;

      // Heavy bloom on beam lines
      ctx.shadowBlur = 28;
      ctx.shadowColor = rgbStr(color, 0.95);

      for (const [thickness, alphaMult] of glowPasses) {
        ctx.strokeStyle = rgbStr(color, alphaMult * effectiveAlpha);
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.moveTo(pt1[0], pt1[1]);
        ctx.lineTo(pt2[0], pt2[1]);
        ctx.stroke();
      }

      // Join spark effect if fingers are within threshold
      const joinAlpha = beamState.joinAlphas[idx] ?? 0.0;
      if (joinAlpha > 0.01) {
        const mx = Math.round((pt1[0] + pt2[0]) / 2);
        const my = Math.round((pt1[1] + pt2[1]) / 2);
        drawJoinEffect(ctx, [mx, my], color, joinAlpha, beamState.time, config);
      }
    }
  }

  ctx.restore();
}

function drawJoinEffect(
  ctx: CanvasRenderingContext2D,
  center: Point2D,
  color: RGBColor,
  alpha: number,
  time: number,
  config: VFXConfig
) {
  const intensity = config.joinEffectIntensity * alpha;
  const baseSize = config.joinEffectMaxSize;

  const pulse = Math.sin(time * 20.0) * 0.12 + 1.0;
  const size = Math.round(baseSize * pulse * alpha);
  if (size <= 0) return;

  ctx.save();
  ctx.shadowBlur = 30;
  ctx.shadowColor = rgbStr(color, 1.0);

  const passes: ReadonlyArray<[number, number, RGBColor]> = [
    [size, 0.20, color],
    [Math.round(size * 0.65), 0.45, color],
    [Math.round(size * 0.35), 0.80, color],
    [Math.round(size * 0.15) + 1, 1.0, [255, 255, 255]],
  ];

  for (const [radius, aMult, c] of passes) {
    if (radius <= 0) continue;
    const effectiveA = Math.min(1.0, aMult * intensity);
    ctx.fillStyle = rgbStr(c, effectiveA);
    ctx.beginPath();
    ctx.arc(center[0], center[1], radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4-point star flare
  const starLen = Math.round(size * 2.0);
  if (starLen > 0) {
    ctx.strokeStyle = rgbStr(color, 0.65 * intensity);
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(center[0] - starLen, center[1]);
    ctx.lineTo(center[0] + starLen, center[1]);
    ctx.moveTo(center[0], center[1] - starLen);
    ctx.lineTo(center[0], center[1] + starLen);
    ctx.stroke();

    const halfStar = Math.round(starLen * 0.5);
    ctx.strokeStyle = rgbStr([255, 255, 255], 0.95 * intensity);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(center[0] - halfStar, center[1]);
    ctx.lineTo(center[0] + halfStar, center[1]);
    ctx.moveTo(center[0], center[1] - halfStar);
    ctx.lineTo(center[0], center[1] + halfStar);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Procedural dynamic lightning arcs with fractal branching
 */
function drawLightningArc(
  ctx: CanvasRenderingContext2D,
  start: Point2D,
  end: Point2D,
  color: RGBColor,
  alpha: number,
  time: number
) {
  const steps = 9;
  const dx = (end[0] - start[0]) / steps;
  const dy = (end[1] - start[1]) / steps;
  const perpX = -dy;
  const perpY = dx;
  const len = Math.hypot(dx, dy) || 1;
  const normPerpX = perpX / len;
  const normPerpY = perpY / len;

  ctx.save();
  ctx.shadowBlur = 25;
  ctx.shadowColor = rgbStr(color, alpha * 0.9);

  ctx.beginPath();
  ctx.moveTo(start[0], start[1]);

  for (let i = 1; i < steps; i++) {
    const jitter = Math.sin(time * 38 + i * 2.7) * 20 * (1 - Math.abs(i - steps / 2) / (steps / 2));
    const px = start[0] + dx * i + normPerpX * jitter;
    const py = start[1] + dy * i + normPerpY * jitter;
    ctx.lineTo(px, py);
  }

  ctx.lineTo(end[0], end[1]);

  ctx.strokeStyle = rgbStr(color, alpha * 0.5);
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.strokeStyle = rgbStr([255, 255, 255], alpha * 0.95);
  ctx.lineWidth = 2.0;
  ctx.stroke();

  ctx.restore();
}

/**
 * Dual-Hand Combo Spell: Intense Spinning Kamehameha / Plasma Core Explosion
 */
export function drawComboPlasmaOrb(
  ctx: CanvasRenderingContext2D,
  comboState: ComboOrbState,
  config: VFXConfig
) {
  if (!config.enableComboOrb || !comboState.active || comboState.charge <= 0.02 || !comboState.center) {
    return;
  }

  const [cx, cy] = comboState.center;
  const charge = comboState.charge;
  const time = comboState.time;
  const baseSize = config.comboMaxSize * (0.35 + 0.65 * charge);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Heavy plasma bloom glow
  ctx.shadowBlur = 30;
  ctx.shadowColor = rgbStr(config.colors.comboAura, 1.0);

  // 1. Expanding shockwave blast rings
  if (comboState.shockwaves.length > 0) {
    for (const sw of comboState.shockwaves) {
      if (sw.alpha <= 0.01) continue;
      ctx.lineWidth = 4.0;
      ctx.strokeStyle = rgbStr(sw.color, sw.alpha * charge);
      ctx.beginPath();
      ctx.arc(cx, cy, sw.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 2.0;
      ctx.strokeStyle = rgbStr([255, 255, 255], sw.alpha * 0.9 * charge);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2, sw.radius - 8), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 2. Dynamic multi-branching lightning arcs connecting both hands to the core
  if (comboState.hand1Palm && comboState.hand2Palm && charge > 0.15) {
    drawLightningArc(ctx, comboState.hand1Palm, [cx, cy], config.colors.primary, charge, time);
    drawLightningArc(ctx, comboState.hand2Palm, [cx, cy], config.colors.secondary, charge, time + 1.3);
  }

  // 3. Counter-rotating swirling accretion vortex arms (Kamehameha spiral core)
  const numArms = 3;
  for (let arm = 0; arm < numArms; arm++) {
    const armOffset = (arm * Math.PI * 2) / numArms;
    ctx.beginPath();
    for (let step = 0; step < 22; step++) {
      const spiralR = (step / 22) * baseSize * 1.6;
      const spiralAngle = armOffset + time * 7.5 + step * 0.18;
      const sx = cx + Math.cos(spiralAngle) * spiralR;
      const sy = cy + Math.sin(spiralAngle) * spiralR;
      if (step === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.strokeStyle = rgbStr(
      arm % 2 === 0 ? config.colors.comboAura : config.colors.comboCorona,
      0.65 * charge
    );
    ctx.lineWidth = 3.5;
    ctx.stroke();
  }

  // 4. Orbiting energy sparks swirling into the plasma vortex
  const numOrbiters = 10;
  for (let i = 0; i < numOrbiters; i++) {
    const angle = time * 8.5 + (i * Math.PI * 2) / numOrbiters;
    const orbDist = baseSize * (1.25 + 0.35 * Math.sin(time * 14 + i * 1.5));
    const ox = cx + Math.cos(angle) * orbDist;
    const oy = cy + Math.sin(angle) * orbDist;

    ctx.fillStyle = rgbStr(i % 2 === 0 ? config.colors.comboAura : config.colors.comboCorona, 0.9 * charge);
    ctx.beginPath();
    ctx.arc(ox, oy, 4.0 * charge, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.beginPath();
    ctx.arc(ox, oy, 1.8 * charge, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Multi-layered pulsating plasma sphere
  const pulse = Math.sin(time * 26.0) * 0.09 + 1.0;
  const radius = baseSize * pulse;

  // Outer corona glow
  const coronaGrad = ctx.createRadialGradient(cx, cy, radius * 0.25, cx, cy, radius * 2.4);
  coronaGrad.addColorStop(0, rgbStr(config.colors.comboCorona, 0.55 * charge));
  coronaGrad.addColorStop(0.5, rgbStr(config.colors.comboAura, 0.30 * charge));
  coronaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coronaGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 2.4, 0, Math.PI * 2);
  ctx.fill();

  // Dense plasma aura sphere
  const auraGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius * 1.15);
  auraGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  auraGrad.addColorStop(0.3, rgbStr(config.colors.comboAura, 0.98 * charge));
  auraGrad.addColorStop(0.7, rgbStr(config.colors.comboCorona, 0.80 * charge));
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
  ctx.fill();

  // 6. Blazing Radial Corona Blast Rays (solar flare spikes)
  const numRays = 18;
  const rayRot = time * 5.0;
  for (let i = 0; i < numRays; i++) {
    const rayTheta = rayRot + (i * Math.PI * 2) / numRays;
    const rayLen = radius * (1.35 + 0.4 * Math.sin(time * 20 + i * 1.6));
    const rx = cx + Math.cos(rayTheta) * rayLen;
    const ry = cy + Math.sin(rayTheta) * rayLen;

    ctx.strokeStyle = rgbStr(config.colors.comboAura, 0.45 * charge);
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(rx, ry);
    ctx.stroke();
  }

  // 7. Blinding white solar core
  const coreRadius = Math.max(5, radius * 0.35);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
  ctx.beginPath();
  ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
  ctx.fill();

  // 8. Celestial 4-Point Starflare Cross
  const flareLen = radius * 3.0;
  ctx.strokeStyle = rgbStr([255, 255, 255], 0.9 * charge);
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(cx - flareLen, cy);
  ctx.lineTo(cx + flareLen, cy);
  ctx.moveTo(cx, cy - flareLen);
  ctx.lineTo(cx, cy + flareLen);
  ctx.stroke();

  ctx.restore();
}

/**
 * Magic Shield Effect with intense gold neon bloom
 */
export function drawMagicShield(
  ctx: CanvasRenderingContext2D,
  shieldState: ShieldState,
  config: VFXConfig
) {
  if (!config.enableShield || shieldState.currentAlpha <= 0.01) return;
  if (!shieldState.lastCenter) return;

  const flicker = 1.0 + Math.sin(shieldState.time * 30.0) * 0.05;
  const intensity =
    config.shieldGlowIntensity * shieldState.currentAlpha * flicker;

  const pulse = Math.sin(shieldState.time * 5.0) * 0.02 + 1.0;
  const radius = Math.round(config.shieldRadius * pulse);

  const color = config.shieldColor;
  const angleOuter = shieldState.time * config.shieldRotationSpeed;
  const angleInner = -shieldState.time * config.shieldRotationSpeed * 1.5;

  const thickPasses: ReadonlyArray<[number, number]> = [
    [26, 0.07],
    [18, 0.18],
    [10, 0.45],
    [4, 0.85],
    [1.5, 1.0],
  ];

  const [cx, cy] = shieldState.lastCenter;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Heavy gold neon bloom
  ctx.shadowBlur = 28;
  ctx.shadowColor = rgbStr(color, 0.95);

  for (const [thickness, alpha] of thickPasses) {
    const layerAlpha = alpha * intensity;
    if (layerAlpha <= 0) continue;

    const c: RGBColor =
      thickness <= 4
        ? [
            Math.min(255, color[0] + 110),
            Math.min(255, color[1] + 110),
            Math.min(255, color[2] + 110),
          ]
        : color;

    const strokeStyle = rgbStr(c, layerAlpha);
    const fillStyle = rgbStr(c, layerAlpha * 0.38);
    ctx.strokeStyle = strokeStyle;

    // 1. Main Outer Ring + secondary inner ring (radius - 15)
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = Math.max(1, thickness - 1);
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, radius - 15), 0, Math.PI * 2);
    ctx.stroke();

    // 2. Outer Octagon
    if (radius > 15) {
      ctx.lineWidth = Math.max(1, thickness - 1);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const theta = angleOuter + i * (Math.PI / 4);
        const x = cx + (radius - 15) * Math.cos(theta);
        const y = cy + (radius - 15) * Math.sin(theta);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // 3. Inner Rotating Square
    const innerR = Math.max(5, radius - 45);
    ctx.lineWidth = thickness;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const theta = angleInner + i * (Math.PI / 2);
      const x = cx + innerR * Math.cos(theta);
      const y = cy + innerR * Math.sin(theta);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // 4. 12 Connecting Radial Lines from Inner to Outer
    ctx.lineWidth = Math.max(1, thickness - 1);
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const theta = angleOuter + i * (Math.PI / 6);
      const x1 = cx + innerR * Math.cos(theta);
      const y1 = cy + innerR * Math.sin(theta);
      const x2 = cx + Math.max(1, radius - 15) * Math.cos(theta);
      const y2 = cy + Math.max(1, radius - 15) * Math.sin(theta);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    // 5. Glowing Core
    const coreR = Math.round(25 * (1.0 + 0.1 * Math.sin(shieldState.time * 10.0)));
    if (thickness > 4) {
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();
    } else if (thickness === 1.5) {
      ctx.fillStyle = strokeStyle;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Outer Runes / Disjoint Arcs
    const arcRadius = radius + 20;
    ctx.lineWidth = thickness;
    for (let i = 0; i < 4; i++) {
      const thetaMid = angleInner * 1.5 + i * (Math.PI / 2);
      const startRad = thetaMid - 0.22;
      const endRad = thetaMid + 0.22;
      ctx.beginPath();
      ctx.arc(cx, cy, arcRadius, startRad, endRad);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Applies cinematic darkening tint & renders the sleek HUD overlay with active spell,
 * gesture confidence, and clean FPS telemetry.
 */
export function drawPostProcessingAndHUD(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: VFXConfig,
  hudData?: {
    fps: number;
    frameTimeMs: number;
    activeSpellName: string;
    confidence: number;
    velocity: number;
    isAudioOn: boolean;
  }
) {
  ctx.save();

  // Cinematic tint overlay from main.py lines 632-635
  if (config.cinematicDarkening > 0) {
    ctx.fillStyle = `rgba(20, 5, 10, ${Math.min(0.75, config.cinematicDarkening)})`;
    ctx.fillRect(0, 0, width, height);
  }

  // Modern sleek HUD banner
  const fps = hudData ? hudData.fps.toFixed(1) : '60.0';
  const frameMs = hudData ? hudData.frameTimeMs.toFixed(1) : '16.6';
  const spell = hudData ? hudData.activeSpellName : 'STANDBY';
  const confPct = hudData ? (hudData.confidence * 100).toFixed(1) : '98.5';
  const vel = hudData ? Math.round(hudData.velocity) : 0;

  ctx.font = '600 13px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
  ctx.textBaseline = 'top';

  // HUD Background Pill Plaque
  ctx.fillStyle = 'rgba(7, 9, 17, 0.72)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(14, 14, 520, 50, 8);
  ctx.fill();
  ctx.stroke();

  // Line 1: Brand & Active Spell
  ctx.fillStyle = '#00f0ff';
  ctx.fillText('AURACRAFT AI', 26, 22);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText('·', 134, 22);

  ctx.fillStyle = '#ffcf33';
  ctx.fillText(spell, 148, 22);

  // Line 2: Telemetry string with typographic separators
  ctx.font = '500 11px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
  ctx.fillStyle = 'rgba(195, 208, 230, 0.85)';
  const telemetryLine = `${fps} FPS · ${frameMs}ms · CONF ${confPct}% · VEL ${vel}px/s`;
  ctx.fillText(telemetryLine, 26, 42);

  // Top Right quick shortcuts badge
  ctx.fillStyle = 'rgba(7, 9, 17, 0.65)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.roundRect(width - 290, 14, 276, 28, 6);
  ctx.fill();
  ctx.stroke();

  ctx.font = '500 10.5px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
  ctx.fillStyle = 'rgba(160, 175, 205, 0.8)';
  ctx.fillText('KEYS: AURA (A) · BEAM (B) · SHIELD (S)', width - 280, 22);

  ctx.restore();
}
