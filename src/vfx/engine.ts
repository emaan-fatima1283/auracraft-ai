export type Point2D = [number, number];
export type RGBColor = [number, number, number];
export type BGRColor = [number, number, number];

export type GesturePresetId =
  | 'shield_open_palm'
  | 'dual_beams'
  | 'fingertip_sparks'
  | 'combo_plasma_orb'
  | 'closed_fist'
  | 'no_hands';

export interface VFXConfig {
  // Visual settings
  glowIntensity: number;
  lineThickness: number;
  lerpSmoothness: number; // 0.1 (very heavy smoothing) to 1.0 (raw instant)

  // Hand tracking
  maxHands: number;
  detectionConfidence: number;
  trackingConfidence: number;
  modelComplexity: number;

  // Effects toggles
  enableParticles: boolean;
  enableTrails: boolean;
  enableComboOrb: boolean;
  enableAura: boolean;
  enableFingertipPulse: boolean;
  enableBeam: boolean;
  enableShield: boolean;
  enableSkeleton: boolean;

  // Cinematic VFX
  cinematicDarkening: number;
  bloomIntensity: number;
  pulseSpeed: number;

  // Dynamic Particles
  particleSpawnRate: number;
  particleDecay: number;
  particleSize: number;

  // Beam effect
  beamFadeSpeed: number;
  beamBlendAlpha: number;

  // Fingertip Join Effect
  joinEffectDistanceThreshold: number;
  joinEffectIntensity: number;
  joinEffectMaxSize: number;
  joinEffectFadeSpeed: number;

  // Magic Shield Effect
  shieldRadius: number;
  shieldRotationSpeed: number;
  shieldGlowIntensity: number;
  shieldColor: RGBColor;

  // Dual-Hand Combo Kamehameha Plasma Orb
  comboDistanceThreshold: number;
  comboChargeSpeed: number;
  comboMaxSize: number;

  // Audio settings
  audioEnabled: boolean;
  audioVolume: number;

  // Skeleton & Aura alpha
  skeletonGlowAlpha: number;
  auraAlpha: number;

  // Palette (converted to RGB from main.py BGR)
  colors: {
    primary: RGBColor;
    secondary: RGBColor;
    accent: RGBColor;
    energy: RGBColor;
    purple: RGBColor;
    pink: RGBColor;
    beamCore: RGBColor;
    beamHighlight: RGBColor;
    thumbLine: RGBColor;
    indexLine: RGBColor;
    middleLine: RGBColor;
    ringLine: RGBColor;
    pinkyLine: RGBColor;
    comboCore: RGBColor;
    comboAura: RGBColor;
    comboCorona: RGBColor;
  };
}

/**
 * Converts an OpenCV BGR color tuple from main.py to standard RGB
 */
export function bgrToRgb(bgr: BGRColor): RGBColor {
  return [bgr[2], bgr[1], bgr[0]];
}

export function createDefaultConfig(): VFXConfig {
  return {
    glowIntensity: 6,
    lineThickness: 2,
    lerpSmoothness: 0.55, // Optimized default: silky-smooth hand motion without lag

    maxHands: 2,
    detectionConfidence: 0.4,
    trackingConfidence: 0.4,
    modelComplexity: 1,

    enableParticles: true,
    enableTrails: true,
    enableComboOrb: true,
    enableAura: true,
    enableFingertipPulse: true,
    enableBeam: true,
    enableShield: true,
    enableSkeleton: true,

    cinematicDarkening: 0.25,
    bloomIntensity: 0.35,
    pulseSpeed: 3.0,

    particleSpawnRate: 1.0,
    particleDecay: 0.94,
    particleSize: 3.5,

    beamFadeSpeed: 4.0,
    beamBlendAlpha: 0.85,

    joinEffectDistanceThreshold: 60.0,
    joinEffectIntensity: 1.0,
    joinEffectMaxSize: 40,
    joinEffectFadeSpeed: 8.0,

    shieldRadius: 120,
    shieldRotationSpeed: 2.0,
    shieldGlowIntensity: 0.6,
    shieldColor: bgrToRgb([0, 140, 255]), // BGR (0, 140, 255) -> RGB (255, 140, 0) Orange-Gold

    comboDistanceThreshold: 220, // Distance between palms to trigger combo plasma explosion
    comboChargeSpeed: 2.8,
    comboMaxSize: 85,

    audioEnabled: true,
    audioVolume: 0.65,

    skeletonGlowAlpha: 0.35,
    auraAlpha: 0.08,

    colors: {
      primary: [0, 255, 255],                 // Cyan (#00FFFF)
      secondary: bgrToRgb([255, 0, 255]),     // Magenta (#FF00FF)
      accent: [255, 255, 0],                  // Yellow
      energy: bgrToRgb([0, 255, 0]),          // Green
      purple: bgrToRgb([128, 0, 255]),        // Purple-Red
      pink: bgrToRgb([255, 105, 180]),        // Pink
      beamCore: bgrToRgb([255, 255, 255]),    // White
      beamHighlight: bgrToRgb([200, 220, 255]),
      thumbLine: bgrToRgb([20, 80, 255]),     // Orange-red (255, 80, 20)
      indexLine: bgrToRgb([255, 255, 0]),     // Cyan (0, 255, 255)
      middleLine: bgrToRgb([220, 0, 255]),    // Magenta (255, 0, 220)
      ringLine: bgrToRgb([255, 60, 140]),     // Purple-blue (140, 60, 255)
      pinkyLine: bgrToRgb([0, 220, 255]),     // Yellow-gold (255, 220, 0)
      comboCore: [255, 255, 255],             // Pure white solar center
      comboAura: [0, 230, 255],               // Brilliant electric plasma cyan
      comboCorona: [255, 60, 190],            // Cosmic violet-magenta corona
    },
  };
}

export const HAND_CONNECTIONS: ReadonlyArray<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],         // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],         // Index
  [5, 9], [9, 10], [10, 11], [11, 12],    // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],  // Ring
  [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [0, 17],                                // Palm base
];

export const FINGERTIP_INDICES = [4, 8, 12, 16, 20] as const;
export const PALM_INDICES = [0, 5, 9, 13, 17] as const;

/**
 * Open palm detection matching MagicShieldEffect.update in main.py:
 * Checks if fingertips [8, 12, 16, 20] are further from wrist (0) than PIP joints [6, 10, 14, 18].
 */
export function isPalmOpen(landmarks: ReadonlyArray<Point2D>): boolean {
  if (!landmarks || landmarks.length < 21) return false;
  const wrist = landmarks[0];
  const tipIndices = [8, 12, 16, 20];
  const pipIndices = [6, 10, 14, 18];

  for (let i = 0; i < tipIndices.length; i++) {
    const tip = landmarks[tipIndices[i]];
    const pip = landmarks[pipIndices[i]];
    const distTip = Math.hypot(tip[0] - wrist[0], tip[1] - wrist[1]);
    const distPip = Math.hypot(pip[0] - wrist[0], pip[1] - wrist[1]);
    if (distTip < distPip) {
      return false;
    }
  }
  return true;
}

/**
 * Averages palm indices [0, 5, 9, 13, 17] as in main.py
 */
export function getPalmCenter(landmarks: ReadonlyArray<Point2D>): Point2D {
  if (!landmarks || landmarks.length < 18) return [0, 0];
  let sumX = 0;
  let sumY = 0;
  for (const idx of PALM_INDICES) {
    sumX += landmarks[idx][0];
    sumY += landmarks[idx][1];
  }
  return [
    Math.round(sumX / PALM_INDICES.length),
    Math.round(sumY / PALM_INDICES.length),
  ];
}

/**
 * Linear interpolation (Lerp) helper
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * Math.max(0, Math.min(1, t));
}

/**
 * High-performance Linear Interpolation (Lerp) hand tracker smoother.
 * Smooths raw 21-landmark tracking points frame-by-frame, removing camera jitter
 * while maintaining instantaneous responsive zero-lag tracking feel.
 * Also computes real-time tracking velocity and gesture confidence.
 */
export class HandTrackerSmoother {
  private smoothedHands: Point2D[][] = [];
  private handVelocities: number[] = [0, 0];
  private lastPalmCenters: Point2D[] = [];
  private overallVelocity: number = 0;
  private confidenceEstimate: number = 0.95;

  public reset() {
    this.smoothedHands = [];
    this.handVelocities = [0, 0];
    this.lastPalmCenters = [];
    this.overallVelocity = 0;
    this.confidenceEstimate = 0.95;
  }

  /**
   * Updates and returns smoothed landmarks for current frame.
   * @param rawHands Incoming detected hand landmark arrays
   * @param dt Delta time in seconds
   * @param smoothnessConfig Lerp factor (0.1 to 1.0)
   */
  public update(
    rawHands: Point2D[][],
    dt: number,
    smoothnessConfig: number = 0.55
  ): {
    smoothed: Point2D[][];
    velocities: number[];
    overallVelocity: number;
    confidence: number;
  } {
    if (!rawHands || rawHands.length === 0) {
      this.smoothedHands = [];
      this.handVelocities = [0, 0];
      this.overallVelocity = lerp(this.overallVelocity, 0, dt * 10);
      this.confidenceEstimate = lerp(this.confidenceEstimate, 0, dt * 6);
      return {
        smoothed: [],
        velocities: [0, 0],
        overallVelocity: this.overallVelocity,
        confidence: this.confidenceEstimate,
      };
    }

    // Time-corrected lerp factor so frame rate variations do not alter responsiveness
    // alpha = 1 - (1 - lerpParam)^(dt * 60)
    const clampedSmooth = Math.max(0.1, Math.min(1.0, smoothnessConfig));
    const effectiveAlpha = 1 - Math.pow(1 - clampedSmooth, Math.max(0.2, dt * 60));

    const updatedHands: Point2D[][] = [];
    const updatedVelocities: number[] = [];

    // Match raw hands to previously smoothed hands using minimum palm center distance
    const rawCenters = rawHands.map((h) => getPalmCenter(h));

    for (let rIdx = 0; rIdx < rawHands.length; rIdx++) {
      const targetLandmarks = rawHands[rIdx];
      const targetCenter = rawCenters[rIdx];

      // Find closest existing hand in previous frame
      let matchedIdx = -1;
      let minDistance = 280; // Maximum distance to consider same hand

      for (let sIdx = 0; sIdx < this.smoothedHands.length; sIdx++) {
        if (sIdx < this.lastPalmCenters.length) {
          const prevCenter = this.lastPalmCenters[sIdx];
          const dist = Math.hypot(targetCenter[0] - prevCenter[0], targetCenter[1] - prevCenter[1]);
          if (dist < minDistance) {
            minDistance = dist;
            matchedIdx = sIdx;
          }
        }
      }

      if (matchedIdx >= 0 && this.smoothedHands[matchedIdx] && this.smoothedHands[matchedIdx].length === 21) {
        // Smooth each of the 21 landmarks
        const prevHand = this.smoothedHands[matchedIdx];
        const smoothedHand: Point2D[] = [];
        let totalDisplacement = 0;

        for (let i = 0; i < 21; i++) {
          const [px, py] = prevHand[i];
          const [tx, ty] = targetLandmarks[i];
          const sx = lerp(px, tx, effectiveAlpha);
          const sy = lerp(py, ty, effectiveAlpha);
          smoothedHand.push([Math.round(sx), Math.round(sy)]);
          totalDisplacement += Math.hypot(tx - px, ty - py);
        }

        // Calculate hand velocity in px/sec
        const avgDisplacement = totalDisplacement / 21;
        const currentSpeed = dt > 0 ? avgDisplacement / dt : 0;
        const smoothedSpeed = lerp(this.handVelocities[matchedIdx] ?? 0, currentSpeed, 0.4);

        updatedHands.push(smoothedHand);
        updatedVelocities.push(smoothedSpeed);
      } else {
        // New hand appeared - snap directly to avoid lerping from distant origin
        updatedHands.push(targetLandmarks.map(([x, y]) => [Math.round(x), Math.round(y)]));
        updatedVelocities.push(0);
      }
    }

    this.smoothedHands = updatedHands;
    this.handVelocities = updatedVelocities;
    this.lastPalmCenters = updatedHands.map((h) => getPalmCenter(h));

    // Overall max velocity across active hands
    const maxVel = updatedVelocities.length > 0 ? Math.max(...updatedVelocities) : 0;
    this.overallVelocity = lerp(this.overallVelocity, maxVel, 0.35);

    // Confidence estimation (stability + anatomical validity)
    const baseConf = 0.94 + Math.min(0.05, (rawHands.length > 0 ? 0.05 : 0));
    const jitterPenalty = Math.min(0.15, this.overallVelocity / 5000);
    this.confidenceEstimate = lerp(this.confidenceEstimate, Math.max(0.75, baseConf - jitterPenalty), 0.2);

    return {
      smoothed: this.smoothedHands,
      velocities: this.handVelocities,
      overallVelocity: this.overallVelocity,
      confidence: this.confidenceEstimate,
    };
  }
}

// ---------------------------------------------------------------------------
// DYNAMIC PARTICLE TRAILS SYSTEM
// ---------------------------------------------------------------------------

export interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  size: number;
  life: number;     // seconds remaining
  maxLife: number;  // total initial duration
  color: RGBColor;
  alpha: number;
  sparklePhase: number;
  isBurstSpark?: boolean;
}

export class ParticleTrailSystem {
  public particles: Particle[] = [];
  /** Maximum active particles hard cap to guarantee rock-solid 60 FPS performance */
  public readonly maxParticles: number = 100;

  public clear() {
    this.particles.length = 0;
  }

  public spawn(
    x: number,
    y: number,
    color: RGBColor,
    options?: {
      velocityScale?: number;
      size?: number;
      life?: number;
      spread?: number;
      isBurstSpark?: boolean;
    }
  ) {
    // Strictly cap particles to avoid exceeding budget
    if (this.particles.length >= this.maxParticles) {
      return;
    }

    const vScale = options?.velocityScale ?? 1.0;
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 35 + 10) * vScale;

    this.particles.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      prevX: x,
      prevY: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 15,
      size: options?.size ?? (Math.random() * 2.8 + 1.8),
      life: options?.life ?? (Math.random() * 0.45 + 0.35),
      maxLife: options?.life ?? 0.6,
      color,
      alpha: 0.95,
      sparklePhase: Math.random() * Math.PI * 2,
      isBurstSpark: options?.isBurstSpark ?? false,
    });
  }

  /**
   * Spawns an explosive burst of trailing sparks radiating outwards when fingers move fast
   */
  public spawnBurst(
    x: number,
    y: number,
    color: RGBColor,
    count: number = 8,
    speedMultiplier: number = 1.0,
    sizeMultiplier: number = 1.0
  ) {
    const availableSlots = this.maxParticles - this.particles.length;
    if (availableSlots <= 0) return;

    const actualCount = Math.min(count, availableSlots);
    for (let i = 0; i < actualCount; i++) {
      const angle = (Math.PI * 2 * i) / actualCount + (Math.random() - 0.5) * 0.6;
      const speed = (Math.random() * 120 + 70) * speedMultiplier;
      const life = Math.random() * 0.4 + 0.25;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        prevX: x,
        prevY: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        size: (Math.random() * 2.5 + 2.0) * sizeMultiplier,
        life,
        maxLife: life,
        color,
        alpha: 1.0,
        sparklePhase: Math.random() * Math.PI * 2,
        isBurstSpark: true,
      });
    }
  }

  /**
   * In-place zero-allocation particle update for guaranteed 60fps performance
   */
  public update(dt: number, decayRate: number = 0.94) {
    let writeIdx = 0;
    const len = this.particles.length;

    for (let i = 0; i < len; i++) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) continue;

      p.prevX = p.x;
      p.prevY = p.y;

      // Velocity decay + subtle buoyancy
      const currentDecay = p.isBurstSpark ? 0.91 : decayRate;
      p.vx *= currentDecay;
      p.vy = p.vy * currentDecay - 14 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Natural quadratic fade-out
      const progress = p.life / p.maxLife;
      p.alpha = Math.pow(progress, 1.35) * 0.98;
      p.sparklePhase += dt * 16;

      this.particles[writeIdx++] = p;
    }

    this.particles.length = writeIdx;
  }
}

// ---------------------------------------------------------------------------
// DUAL-HAND COMBO SPELL: KAMEHAMEHA PLASMA ORB
// ---------------------------------------------------------------------------

export interface ComboShockwave {
  radius: number;
  maxRadius: number;
  alpha: number;
  color: RGBColor;
}

export interface ComboOrbState {
  time: number;
  active: boolean;
  charge: number;        // 0.0 to 1.0
  center: Point2D | null;
  distance: number;
  hand1Palm: Point2D | null;
  hand2Palm: Point2D | null;
  shockwaves: ComboShockwave[];
  lastShockwaveTime: number;
}

export function createInitialComboOrbState(): ComboOrbState {
  return {
    time: 0,
    active: false,
    charge: 0,
    center: null,
    distance: 999,
    hand1Palm: null,
    hand2Palm: null,
    shockwaves: [],
    lastShockwaveTime: 0,
  };
}

export function updateComboOrbState(
  state: ComboOrbState,
  dt: number,
  landmarksList: ReadonlyArray<ReadonlyArray<Point2D>> | null,
  config: VFXConfig
): { state: ComboOrbState; triggeredExplosion: boolean } {
  const nextTime = state.time + dt;
  let targetCharge = 0.0;
  let center: Point2D | null = null;
  let dist = 999;
  let h1Palm: Point2D | null = null;
  let h2Palm: Point2D | null = null;
  let triggeredExplosion = false;

  if (config.enableComboOrb && landmarksList && landmarksList.length >= 2) {
    const hand1 = landmarksList[0];
    const hand2 = landmarksList[1];
    h1Palm = getPalmCenter(hand1);
    h2Palm = getPalmCenter(hand2);

    dist = Math.hypot(h2Palm[0] - h1Palm[0], h2Palm[1] - h1Palm[1]);

    if (dist < config.comboDistanceThreshold) {
      // Hands close together: trigger combo plasma orb!
      center = [
        Math.round((h1Palm[0] + h2Palm[0]) * 0.5),
        Math.round((h1Palm[1] + h2Palm[1]) * 0.5),
      ];
      // Closeness multiplier (closer hands charge faster)
      const closenessFactor = 1.0 + Math.max(0, (config.comboDistanceThreshold - dist) / 100);
      targetCharge = 1.0;

      const chargeDiff = targetCharge - state.charge;
      const nextCharge = Math.min(1.0, state.charge + chargeDiff * dt * config.comboChargeSpeed * closenessFactor);

      // Periodically trigger expanding shockwaves while charging
      const shockwaves = [...state.shockwaves];
      if (nextCharge > 0.4 && nextTime - state.lastShockwaveTime > 0.28) {
        shockwaves.push({
          radius: 12,
          maxRadius: Math.round(config.comboMaxSize * 2.2),
          alpha: 0.9,
          color: config.colors.comboAura,
        });
        state.lastShockwaveTime = nextTime;
      }

      if (state.charge < 0.85 && nextCharge >= 0.85) {
        triggeredExplosion = true;
      }

      // Update existing shockwaves
      const updatedShockwaves = shockwaves
        .map((sw) => {
          const r = sw.radius + dt * 260;
          const a = sw.alpha * Math.max(0, 1 - r / sw.maxRadius);
          return { ...sw, radius: r, alpha: a };
        })
        .filter((sw) => sw.radius < sw.maxRadius && sw.alpha > 0.02);

      return {
        state: {
          time: nextTime,
          active: nextCharge > 0.05,
          charge: nextCharge,
          center,
          distance: dist,
          hand1Palm: h1Palm,
          hand2Palm: h2Palm,
          shockwaves: updatedShockwaves,
          lastShockwaveTime: state.lastShockwaveTime,
        },
        triggeredExplosion,
      };
    }
  }

  // Fade out smoothly if hands separate
  const chargeDiff = 0.0 - state.charge;
  const nextCharge = Math.max(0.0, state.charge + chargeDiff * dt * 4.5);

  const updatedShockwaves = state.shockwaves
    .map((sw) => {
      const r = sw.radius + dt * 260;
      const a = sw.alpha * Math.max(0, 1 - r / sw.maxRadius);
      return { ...sw, radius: r, alpha: a };
    })
    .filter((sw) => sw.radius < sw.maxRadius && sw.alpha > 0.02);

  return {
    state: {
      time: nextTime,
      active: nextCharge > 0.05,
      charge: nextCharge,
      center: state.center,
      distance: dist,
      hand1Palm: h1Palm,
      hand2Palm: h2Palm,
      shockwaves: updatedShockwaves,
      lastShockwaveTime: state.lastShockwaveTime,
    },
    triggeredExplosion: false,
  };
}

// ---------------------------------------------------------------------------
// SHIELD & BEAM STATES
// ---------------------------------------------------------------------------

export interface ShieldState {
  time: number;
  currentAlpha: number;
  fadeSpeed: number;
  lastCenter: Point2D | null;
  isOpenPalmDetected: boolean;
}

export function createInitialShieldState(): ShieldState {
  return {
    time: 0,
    currentAlpha: 0,
    fadeSpeed: 8.0,
    lastCenter: null,
    isOpenPalmDetected: false,
  };
}

export function updateShieldState(
  state: ShieldState,
  dt: number,
  landmarksList: ReadonlyArray<ReadonlyArray<Point2D>> | null
): ShieldState {
  const nextTime = state.time + dt;
  let targetAlpha = 0.0;
  let lastCenter = state.lastCenter;
  let isOpenPalmDetected = false;

  // Activate ONLY when exactly one hand is detected (matches main.py line 440)
  if (landmarksList && landmarksList.length === 1) {
    const landmarks = landmarksList[0];
    if (isPalmOpen(landmarks)) {
      isOpenPalmDetected = true;
      targetAlpha = 1.0;
      lastCenter = getPalmCenter(landmarks);
    }
  }

  const alphaDiff = targetAlpha - state.currentAlpha;
  const rawAlpha = state.currentAlpha + alphaDiff * dt * state.fadeSpeed;
  const currentAlpha = Math.max(0.0, Math.min(1.0, rawAlpha));

  return {
    time: nextTime,
    currentAlpha,
    fadeSpeed: state.fadeSpeed,
    lastCenter,
    isOpenPalmDetected,
  };
}

export interface BeamState {
  time: number;
  beamAlpha: number;
  targetAlpha: number;
  hand1Landmarks: ReadonlyArray<Point2D> | null;
  hand2Landmarks: ReadonlyArray<Point2D> | null;
  joinAlphas: Record<number, number>;
}

export function createInitialBeamState(): BeamState {
  return {
    time: 0,
    beamAlpha: 0,
    targetAlpha: 0,
    hand1Landmarks: null,
    hand2Landmarks: null,
    joinAlphas: { 4: 0, 8: 0, 12: 0, 16: 0, 20: 0 },
  };
}

export function updateBeamState(
  state: BeamState,
  dt: number,
  landmarksList: ReadonlyArray<ReadonlyArray<Point2D>> | null,
  config: VFXConfig
): BeamState {
  const nextTime = state.time + dt;
  const currentHandCount = landmarksList ? landmarksList.length : 0;
  const targetAlpha = currentHandCount >= 2 ? 1.0 : 0.0;

  const alphaDiff = targetAlpha - state.beamAlpha;
  const beamAlpha = Math.max(
    0.0,
    Math.min(1.0, state.beamAlpha + alphaDiff * dt * config.beamFadeSpeed)
  );

  const nextJoinAlphas: Record<number, number> = { ...state.joinAlphas };
  let hand1Landmarks: ReadonlyArray<Point2D> | null = null;
  let hand2Landmarks: ReadonlyArray<Point2D> | null = null;

  if (landmarksList && landmarksList.length >= 2) {
    hand1Landmarks = landmarksList[0];
    hand2Landmarks = landmarksList[1];

    for (const idx of FINGERTIP_INDICES) {
      if (idx < hand1Landmarks.length && idx < hand2Landmarks.length) {
        const [x1, y1] = hand1Landmarks[idx];
        const [x2, y2] = hand2Landmarks[idx];
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const target = dist < config.joinEffectDistanceThreshold ? 1.0 : 0.0;
        const jDiff = target - (state.joinAlphas[idx] ?? 0);
        const newAlpha =
          (state.joinAlphas[idx] ?? 0) + jDiff * dt * config.joinEffectFadeSpeed;
        nextJoinAlphas[idx] = Math.max(0.0, Math.min(1.0, newAlpha));
      } else {
        const jDiff = 0.0 - (state.joinAlphas[idx] ?? 0);
        const newAlpha =
          (state.joinAlphas[idx] ?? 0) + jDiff * dt * config.joinEffectFadeSpeed;
        nextJoinAlphas[idx] = Math.max(0.0, Math.min(1.0, newAlpha));
      }
    }
  } else {
    for (const idx of FINGERTIP_INDICES) {
      const jDiff = 0.0 - (state.joinAlphas[idx] ?? 0);
      const newAlpha =
        (state.joinAlphas[idx] ?? 0) + jDiff * dt * config.joinEffectFadeSpeed;
      nextJoinAlphas[idx] = Math.max(0.0, Math.min(1.0, newAlpha));
    }
  }

  return {
    time: nextTime,
    beamAlpha,
    targetAlpha,
    hand1Landmarks,
    hand2Landmarks,
    joinAlphas: nextJoinAlphas,
  };
}

/**
 * Generates an articulated 21-landmark hand around a center point (cx, cy).
 * Supports open palm, angled inward (beam/join), cupped combo pose, or closed fist poses.
 */
export function buildHandLandmarks(options: {
  centerX: number;
  centerY: number;
  scale?: number;
  mirrorX?: boolean;
  pose?: 'open' | 'fist' | 'reaching' | 'cupped';
  time?: number;
}): Point2D[] {
  const {
    centerX,
    centerY,
    scale = 1.0,
    mirrorX = false,
    pose = 'open',
    time = 0,
  } = options;
  const dir = mirrorX ? -1 : 1;
  // Subtle organic breathing motion
  const swayX = Math.sin(time * 1.8 + (mirrorX ? 1.5 : 0)) * 4;
  const swayY = Math.cos(time * 2.2 + (mirrorX ? 0.8 : 0)) * 4;
  const cx = centerX + swayX;
  const cy = centerY + swayY;

  if (pose === 'fist') {
    // Landmarks where fingertips [8,12,16,20] are closer to wrist [0] than PIP joints [6,10,14,18]
    const raw: Point2D[] = [
      [0, 85],       // 0: Wrist
      [-38, 60],     // 1: Thumb CMC
      [-52, 32],     // 2: Thumb MCP
      [-38, 12],     // 3: Thumb IP
      [-18, 22],     // 4: Thumb Tip (tucked)
      [-35, -5],     // 5: Index MCP
      [-36, -38],    // 6: Index PIP (far from wrist)
      [-32, -18],    // 7: Index DIP (curled back)
      [-28, 8],      // 8: Index Tip (closer to wrist than PIP)
      [-12, -12],    // 9: Middle MCP
      [-12, -45],    // 10: Middle PIP
      [-10, -22],    // 11: Middle DIP
      [-10, 6],      // 12: Middle Tip
      [12, -8],      // 13: Ring MCP
      [14, -40],     // 14: Ring PIP
      [12, -18],     // 15: Ring DIP
      [10, 10],      // 16: Ring Tip
      [34, 2],       // 17: Pinky MCP
      [36, -28],     // 18: Pinky PIP
      [32, -10],     // 19: Pinky DIP
      [28, 15],      // 20: Pinky Tip
    ];
    return raw.map(([dx, dy]) => [
      Math.round(cx + dx * dir * scale),
      Math.round(cy + dy * scale),
    ]);
  }

  if (pose === 'cupped') {
    // Both hands cupped around an orb for Kamehameha Combo spell
    const raw: Point2D[] = [
      [-65, 80],     // 0: Wrist
      [-50, 40],     // 1: Thumb CMC
      [-22, 10],     // 2: Thumb MCP
      [16, -10],     // 3: Thumb IP
      [52, -26],     // 4: Thumb Tip
      [-15, 8],      // 5: Index MCP
      [22, -6],      // 6: Index PIP
      [58, -12],     // 7: Index DIP
      [82, -8],      // 8: Index Tip
      [-10, 32],     // 9: Middle MCP
      [28, 24],      // 10: Middle PIP
      [64, 18],      // 11: Middle DIP
      [88, 20],      // 12: Middle Tip
      [-14, 55],     // 13: Ring MCP
      [20, 52],      // 14: Ring PIP
      [54, 48],      // 15: Ring DIP
      [78, 52],      // 16: Ring Tip
      [-25, 76],     // 17: Pinky MCP
      [8, 75],       // 18: Pinky PIP
      [38, 72],      // 19: Pinky DIP
      [64, 75],      // 20: Pinky Tip
    ];
    return raw.map(([dx, dy]) => [
      Math.round(cx + dx * dir * scale),
      Math.round(cy + dy * scale),
    ]);
  }

  if (pose === 'reaching') {
    // Fingers angled horizontally toward the opposite hand for beam & spark connections
    const raw: Point2D[] = [
      [-95, 70],     // 0: Wrist
      [-65, 20],     // 1: Thumb CMC
      [-28, -14],    // 2: Thumb MCP
      [24, -36],     // 3: Thumb IP
      [76, -50],     // 4: Thumb Tip
      [-25, -14],    // 5: Index MCP
      [15, -22],     // 6: Index PIP
      [54, -25],     // 7: Index DIP
      [88, -26],     // 8: Index Tip
      [-22, 12],     // 9: Middle MCP
      [20, 8],       // 10: Middle PIP
      [60, 6],       // 11: Middle DIP
      [94, 5],       // 12: Middle Tip
      [-26, 36],     // 13: Ring MCP
      [14, 35],      // 14: Ring PIP
      [52, 35],      // 15: Ring DIP
      [86, 36],      // 16: Ring Tip
      [-35, 60],     // 17: Pinky MCP
      [4, 62],       // 18: Pinky PIP
      [42, 64],      // 19: Pinky DIP
      [76, 66],      // 20: Pinky Tip
    ];
    return raw.map(([dx, dy]) => [
      Math.round(cx + dx * dir * scale),
      Math.round(cy + dy * scale),
    ]);
  }

  // Default: 'open' upright open palm (activates MagicShieldEffect when 1 hand is present)
  const raw: Point2D[] = [
    [0, 110],      // 0: Wrist
    [-46, 75],     // 1: Thumb CMC
    [-78, 38],     // 2: Thumb MCP
    [-102, 2],     // 3: Thumb IP
    [-122, -30],   // 4: Thumb Tip
    [-44, 2],      // 5: Index MCP
    [-56, -48],    // 6: Index PIP
    [-64, -88],    // 7: Index DIP
    [-70, -126],   // 8: Index Tip
    [-14, -8],     // 9: Middle MCP
    [-16, -62],    // 10: Middle PIP
    [-18, -106],   // 11: Middle DIP
    [-18, -146],   // 12: Middle Tip
    [18, -2],      // 13: Ring MCP
    [24, -54],     // 14: Ring PIP
    [30, -96],     // 15: Ring DIP
    [34, -132],    // 16: Ring Tip
    [46, 14],      // 17: Pinky MCP
    [60, -28],     // 18: Pinky PIP
    [72, -62],     // 19: Pinky DIP
    [82, -94],     // 20: Pinky Tip
  ];

  return raw.map(([dx, dy]) => [
    Math.round(cx + dx * dir * scale),
    Math.round(cy + dy * scale),
  ]);
}

export function generateSimulatedHands(
  preset: GesturePresetId,
  width: number,
  height: number,
  time: number,
  handOffsets?: { hand1: Point2D; hand2: Point2D; beamSeparationOffset?: number }
): Point2D[][] {
  const h1Offset = handOffsets?.hand1 ?? [0, 0];
  const h2Offset = handOffsets?.hand2 ?? [0, 0];
  const sep = handOffsets?.beamSeparationOffset ?? 0;

  switch (preset) {
    case 'shield_open_palm': {
      return [
        buildHandLandmarks({
          centerX: width * 0.5 + h1Offset[0],
          centerY: height * 0.52 + h1Offset[1],
          scale: 1.05,
          pose: 'open',
          time,
        }),
      ];
    }
    case 'combo_plasma_orb': {
      // Both hands brought closely together (~140px palm distance) to trigger the combo plasma orb
      const comboSpread = 72 + sep;
      return [
        buildHandLandmarks({
          centerX: width * 0.5 - comboSpread + h1Offset[0],
          centerY: height * 0.5 + h1Offset[1],
          scale: 1.02,
          mirrorX: false,
          pose: 'cupped',
          time,
        }),
        buildHandLandmarks({
          centerX: width * 0.5 + comboSpread + h2Offset[0],
          centerY: height * 0.5 + h2Offset[1],
          scale: 1.02,
          mirrorX: true,
          pose: 'cupped',
          time,
        }),
      ];
    }
    case 'dual_beams': {
      const baseSpread = 220 + sep;
      return [
        buildHandLandmarks({
          centerX: width * 0.5 - baseSpread + h1Offset[0],
          centerY: height * 0.5 + h1Offset[1],
          scale: 1.05,
          mirrorX: false,
          pose: 'reaching',
          time,
        }),
        buildHandLandmarks({
          centerX: width * 0.5 + baseSpread + h2Offset[0],
          centerY: height * 0.5 + h2Offset[1],
          scale: 1.05,
          mirrorX: true,
          pose: 'reaching',
          time,
        }),
      ];
    }
    case 'fingertip_sparks': {
      // Position the two reaching hands so fingertips are within ~24px (< 60px threshold)
      const sparkSpread = 92 + sep;
      return [
        buildHandLandmarks({
          centerX: width * 0.5 - sparkSpread + h1Offset[0],
          centerY: height * 0.5 + h1Offset[1],
          scale: 1.0,
          mirrorX: false,
          pose: 'reaching',
          time,
        }),
        buildHandLandmarks({
          centerX: width * 0.5 + sparkSpread + h2Offset[0],
          centerY: height * 0.5 + h2Offset[1],
          scale: 1.0,
          mirrorX: true,
          pose: 'reaching',
          time,
        }),
      ];
    }
    case 'closed_fist': {
      return [
        buildHandLandmarks({
          centerX: width * 0.5 + h1Offset[0],
          centerY: height * 0.52 + h1Offset[1],
          scale: 1.05,
          pose: 'fist',
          time,
        }),
      ];
    }
    case 'no_hands':
    default:
      return [];
  }
}
