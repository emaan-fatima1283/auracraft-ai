/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Sparkles, Video, Move, Volume2, VolumeX, Shield, Zap } from 'lucide-react';
import {
  FINGERTIP_INDICES,
  GesturePresetId,
  HandTrackerSmoother,
  ParticleTrailSystem,
  Point2D,
  VFXConfig,
  createDefaultConfig,
  createInitialBeamState,
  createInitialComboOrbState,
  createInitialShieldState,
  generateSimulatedHands,
  getPalmCenter,
  isPalmOpen,
  updateBeamState,
  updateComboOrbState,
  updateShieldState,
} from './vfx/engine';
import {
  drawBeamEffect,
  drawComboPlasmaOrb,
  drawHandAura,
  drawHandSkeleton,
  drawMagicShield,
  drawParticleTrails,
  drawPostProcessingAndHUD,
  drawStudioBackdrop,
} from './vfx/renderer';
import { ControlPanel, TelemetrySnapshot } from './components/ControlPanel';
import { vfxAudio } from './vfx/audio';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

export default function App() {
  const [sourceMode, setSourceMode] = useState<'simulation' | 'webcam'>('simulation');
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<GesturePresetId>('combo_plasma_orb');
  const [config, setConfig] = useState<VFXConfig>(() => createDefaultConfig());
  const [beamSeparationOffset, setBeamSeparationOffset] = useState<number>(0);
  const [audioActive, setAudioActive] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>({
    handsCount: 2,
    palmOpen: false,
    shieldActive: false,
    beamActive: true,
    comboActive: true,
    comboCharge: 0.9,
    activeSparksCount: 0,
    activeSpellName: 'KAMEHAMEHA COMBO ORB',
    fps: 60.0,
    frameTimeMs: 16.6,
    confidence: 0.985,
    velocity: 0,
    audioActive: false,
  });

  // Canvas and Vision Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastDetectionTimestampRef = useRef<number>(0);
  const latestWebcamLandmarksRef = useRef<Point2D[][]>([]);
  const consecutiveEmptyFramesRef = useRef<number>(0);

  // High-performance Lerp Hand Tracker & Particle System
  const smootherRef = useRef<HandTrackerSmoother>(new HandTrackerSmoother());
  const particleSystemRef = useRef<ParticleTrailSystem>(new ParticleTrailSystem());

  const configRef = useRef<VFXConfig>(config);
  configRef.current = config;

  const sourceModeRef = useRef<'simulation' | 'webcam'>(sourceMode);
  sourceModeRef.current = sourceMode;

  const activePresetRef = useRef<GesturePresetId>(activePreset);
  activePresetRef.current = activePreset;

  const beamSeparationRef = useRef<number>(beamSeparationOffset);
  beamSeparationRef.current = beamSeparationOffset;

  const audioActiveRef = useRef<boolean>(audioActive);
  audioActiveRef.current = audioActive;

  const handOffsetsRef = useRef<{ hand1: Point2D; hand2: Point2D }>({
    hand1: [0, 0],
    hand2: [0, 0],
  });
  const draggingHandRef = useRef<'hand1' | 'hand2' | null>(null);
  const dragStartMouseRef = useRef<Point2D>([0, 0]);
  const dragStartOffsetRef = useRef<Point2D>([0, 0]);
  const latestLandmarksRef = useRef<Point2D[][]>([]);

  // VFX States
  const shieldStateRef = useRef(createInitialShieldState());
  const beamStateRef = useRef(createInitialBeamState());
  const comboOrbStateRef = useRef(createInitialComboOrbState());
  const pulseTimeRef = useRef<number>(0);

  // Audio trigger memory
  const prevShieldActiveRef = useRef<boolean>(false);
  const prevBeamActiveRef = useRef<boolean>(false);
  const prevSparksActiveRef = useRef<boolean>(false);

  // Performance Telemetry & Cached Canvas Context
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const avgFpsRef = useRef<number>(60);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const lastDetectionTimeRef = useRef<number>(0);

  // Toggle audio engine
  const handleToggleAudio = useCallback(() => {
    vfxAudio.init();
    const nextState = !audioActiveRef.current;
    setAudioActive(nextState);
    vfxAudio.setMuted(!nextState);
    if (nextState) {
      vfxAudio.playShieldChime();
    }
  }, []);

  // Toggle individual VFX layer
  const handleToggleEffect = useCallback(
    (
      key:
        | 'enableAura'
        | 'enableBeam'
        | 'enableShield'
        | 'enableSkeleton'
        | 'enableParticles'
        | 'enableComboOrb'
    ) => {
      setConfig((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    },
    []
  );

  const handleUpdateConfig = useCallback(
    <K extends keyof VFXConfig>(key: K, value: VFXConfig[K]) => {
      setConfig((prev) => {
        const next = { ...prev, [key]: value };
        if (key === 'audioVolume') {
          vfxAudio.setMasterVolume(Number(value));
        }
        return next;
      });
    },
    []
  );

  const handleResetConfig = useCallback(() => {
    setConfig(createDefaultConfig());
    smootherRef.current.reset();
  }, []);

  const handleResetHandPositions = useCallback(() => {
    handOffsetsRef.current = { hand1: [0, 0], hand2: [0, 0] };
    setBeamSeparationOffset(0);
    smootherRef.current.reset();
  }, []);

  const handlePresetChange = useCallback((preset: GesturePresetId) => {
    setActivePreset(preset);
    handOffsetsRef.current = { hand1: [0, 0], hand2: [0, 0] };
    setBeamSeparationOffset(0);
    smootherRef.current.reset();
  }, []);

  // Keyboard shortcuts matching main.py (a: aura, b: beam, s: shield) + m for mute
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'a') {
        handleToggleEffect('enableAura');
      } else if (key === 'b') {
        handleToggleEffect('enableBeam');
      } else if (key === 's') {
        handleToggleEffect('enableShield');
      } else if (key === 'm') {
        handleToggleAudio();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleToggleAudio, handleToggleEffect]);

  // Handle Webcam initialization with optimized MediaPipe configuration
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function initWebcam() {
      if (sourceMode !== 'webcam') {
        setWebcamError(null);
        return;
      }

      try {
        setWebcamError(null);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not available in this browser environment.');
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 },
            facingMode: 'user',
            frameRate: { ideal: 60, min: 30 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Ensure video metadata is loaded before initiating playback
          await new Promise<void>((resolve) => {
            const vid = videoRef.current;
            if (!vid) return resolve();
            if (vid.readyState >= 2) {
              vid.play().then(() => resolve()).catch(() => resolve());
              return;
            }
            vid.onloadeddata = () => {
              vid.play().then(() => resolve()).catch(() => resolve());
            };
          });
        }

        if (!handLandmarkerRef.current) {
          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
          );

          // Configure MediaPipe with 0.4 confidence for robust detection under normal lighting
          try {
            handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                delegate: 'GPU',
              },
              runningMode: 'VIDEO',
              numHands: 2,
              minHandDetectionConfidence: 0.4,
              minTrackingConfidence: 0.4,
              minHandPresenceConfidence: 0.4,
            });
          } catch {
            // Graceful fallback to CPU delegate if GPU context is unavailable in sandboxed iframe
            handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                delegate: 'CPU',
              },
              runningMode: 'VIDEO',
              numHands: 2,
              minHandDetectionConfidence: 0.4,
              minTrackingConfidence: 0.4,
              minHandPresenceConfidence: 0.4,
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? `Webcam unavailable: ${err.message}`
              : 'Could not access webcam. Using Simulated Hands fallback.';
          setWebcamError(message);
        }
      }
    }

    initWebcam();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [sourceMode]);

  // Main High-Performance 60FPS Canvas Render Loop (Zero artificial delay)
  useEffect(() => {
    let animationFrameId = 0;
    let isMounted = true;
    let lastTelemetryUpdate = 0;

    const renderFrame = (now: number) => {
      if (!isMounted) return;

      // Tab visibility optimization: pause heavy rendering if tab is hidden
      if (document.hidden) {
        lastFrameTimeRef.current = now;
        animationFrameId = window.requestAnimationFrame(renderFrame);
        return;
      }

      const rawDt = (now - lastFrameTimeRef.current) / 1000;
      const dt = Math.min(0.066, Math.max(0.008, rawDt)); // Clamp dt to prevent teleporting
      lastFrameTimeRef.current = now;
      pulseTimeRef.current += dt;

      // Low-overhead Exponential Moving Average (EMA) for 60 FPS telemetry without array allocations
      const fpsInstant = dt > 0 ? 1 / dt : 60;
      avgFpsRef.current = avgFpsRef.current * 0.92 + fpsInstant * 0.08;
      const avgFps = avgFpsRef.current;
      const avgFrameMs = dt * 1000;

      const canvas = canvasRef.current;
      if (!ctxRef.current && canvas) {
        ctxRef.current = canvas.getContext('2d', {
          alpha: false,
          desynchronized: true,
        });
      }
      const ctx = ctxRef.current;
      const currentConfig = configRef.current;

      if (canvas && ctx) {
        let rawLandmarksList: Point2D[][] = [];
        const isWebcamReady =
          sourceModeRef.current === 'webcam' &&
          videoRef.current &&
          videoRef.current.readyState >= 2 &&
          videoRef.current.videoWidth > 0 &&
          videoRef.current.videoHeight > 0;

        if (isWebcamReady && videoRef.current) {
          if (handLandmarkerRef.current) {
            // Frame throttling for MediaPipe hand detection (~32ms / 30 FPS cadence)
            // Keeps ML inference lightweight and prevents main-thread lag while canvas renders at 60+ FPS
            const isThrottled = now - lastDetectionTimeRef.current < 32;
            const isNewVideoFrame = videoRef.current.currentTime !== lastVideoTimeRef.current;
            if (!isThrottled && isNewVideoFrame) {
              lastDetectionTimeRef.current = now;
              lastVideoTimeRef.current = videoRef.current.currentTime;
              // Ensure timestamp is strictly monotonically increasing for MediaPipe Tasks Vision
              const detectionTimestamp = Math.max(now, lastDetectionTimestampRef.current + 1);
              lastDetectionTimestampRef.current = detectionTimestamp;

              try {
                const results = handLandmarkerRef.current.detectForVideo(
                  videoRef.current,
                  detectionTimestamp
                );
                if (results.landmarks && results.landmarks.length > 0) {
                  latestWebcamLandmarksRef.current = results.landmarks.map((handLms) =>
                    handLms.map((lm) => [
                      Math.round((1 - lm.x) * CANVAS_WIDTH),
                      Math.round(lm.y * CANVAS_HEIGHT),
                    ])
                  );
                  consecutiveEmptyFramesRef.current = 0;
                } else {
                  consecutiveEmptyFramesRef.current += 1;
                  // Persist for up to 3 frames (~100ms) to prevent flicker during fast hand motion
                  if (consecutiveEmptyFramesRef.current > 3) {
                    latestWebcamLandmarksRef.current = [];
                  }
                }
              } catch {
                // Gracefully ignore transient detection timing errors without dropping frames
              }
            }
          }
          rawLandmarksList = latestWebcamLandmarksRef.current;
        }

        // Calculate subtle screen shake for high-charge combo explosion
        let shakeX = 0;
        let shakeY = 0;
        if (comboOrbStateRef.current.active && comboOrbStateRef.current.charge > 0.62) {
          const intensity = Math.pow((comboOrbStateRef.current.charge - 0.62) / 0.38, 1.8) * 7.5;
          shakeX = (Math.random() - 0.5) * intensity;
          shakeY = (Math.random() - 0.5) * intensity;
        }

        ctx.save();
        if (shakeX !== 0 || shakeY !== 0) {
          ctx.translate(shakeX, shakeY);
        }

        if (isWebcamReady && videoRef.current) {
          // Draw mirrored webcam frame (matches cv2.flip(frame, 1) in main.py)
          ctx.save();
          ctx.translate(CANVAS_WIDTH, 0);
          ctx.scale(-1, 1);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(videoRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.restore();
        } else {
          // Simulated Studio Hands Mode
          rawLandmarksList = generateSimulatedHands(
            activePresetRef.current,
            CANVAS_WIDTH,
            CANVAS_HEIGHT,
            pulseTimeRef.current,
            {
              hand1: handOffsetsRef.current.hand1,
              hand2: handOffsetsRef.current.hand2,
              beamSeparationOffset: beamSeparationRef.current,
            }
          );
          drawStudioBackdrop(
            ctx,
            CANVAS_WIDTH,
            CANVAS_HEIGHT,
            rawLandmarksList,
            pulseTimeRef.current
          );
        }

        // 1. Linear Interpolation (Lerp) Smoothing for zero-lag, silky hand coordinates
        const {
          smoothed: landmarksList,
          velocities: handVelocities,
          overallVelocity,
          confidence,
        } = smootherRef.current.update(
          rawLandmarksList,
          dt,
          currentConfig.lerpSmoothness
        );

        latestLandmarksRef.current = landmarksList;

        // 2. Modulate Web Audio API continuous hum with hand movement speed
        if (audioActiveRef.current) {
          vfxAudio.updateMovement(overallVelocity, landmarksList.length);
        }

        // 3. Emit Dynamic Magic Dust & Explosive Trailing Sparks from fingertips
        const particleSystem = particleSystemRef.current;
        if (currentConfig.enableParticles && landmarksList.length > 0) {
          const handColors = [
            currentConfig.colors.primary,
            currentConfig.colors.secondary,
          ];

          landmarksList.forEach((landmarks, hIdx) => {
            const hColor = handColors[hIdx % handColors.length];
            const hVel = handVelocities[hIdx] ?? 0;
            const velocityMultiplier = Math.min(2.5, 0.4 + hVel / 240);

            for (const tipIdx of FINGERTIP_INDICES) {
              if (tipIdx < landmarks.length) {
                const [tx, ty] = landmarks[tipIdx];

                // Continuous ambient magic dust (budget-calibrated for 100-particle cap)
                if ((hVel > 35 && Math.random() < 0.35) || Math.random() < 0.08) {
                  particleSystem.spawn(tx, ty, hColor, {
                    velocityScale: 0.8 + velocityMultiplier * 0.4,
                    size: currentConfig.particleSize * (0.8 + Math.random() * 0.5),
                    life: 0.45 + Math.random() * 0.35,
                  });
                }

                // Explosive radial bursts with trailing spark physics on fast swings
                if (hVel > 190 && Math.random() < 0.35) {
                  const sparkCount = Math.min(3, Math.round(2 + (hVel - 190) / 120));
                  particleSystem.spawnBurst(
                    tx,
                    ty,
                    hColor,
                    sparkCount,
                    1.1 + hVel / 450,
                    1.1
                  );
                }
              }
            }
          });
        }

        // Update particle physics with velocity decay
        particleSystem.update(dt, currentConfig.particleDecay);

        // 4. Draw Hand Skeletons & Palm Auras
        const handColors = [
          currentConfig.colors.primary,
          currentConfig.colors.secondary,
        ];
        landmarksList.forEach((landmarks, handIdx) => {
          const color = handColors[handIdx % handColors.length];
          drawHandSkeleton(ctx, landmarks, color, currentConfig);
          drawHandAura(ctx, landmarks, color, pulseTimeRef.current, currentConfig);
        });

        // 5. Update and Draw Fingertip Beams & Join Sparks
        beamStateRef.current = updateBeamState(
          beamStateRef.current,
          dt,
          landmarksList,
          currentConfig
        );
        drawBeamEffect(ctx, beamStateRef.current, currentConfig);

        // 6. Update and Draw Dr. Strange Magic Shield
        shieldStateRef.current = updateShieldState(
          shieldStateRef.current,
          dt,
          landmarksList
        );
        drawMagicShield(ctx, shieldStateRef.current, currentConfig);

        // 7. Update and Draw Dual-Hand Combo Kamehameha Plasma Orb
        const { state: nextComboState, triggeredExplosion } = updateComboOrbState(
          comboOrbStateRef.current,
          dt,
          landmarksList,
          currentConfig
        );
        comboOrbStateRef.current = nextComboState;

        if (nextComboState.active && nextComboState.center) {
          drawComboPlasmaOrb(ctx, nextComboState, currentConfig);

          // Spawn burst particles around plasma core
          if (Math.random() < 0.85) {
            particleSystem.spawn(
              nextComboState.center[0] + (Math.random() - 0.5) * 40,
              nextComboState.center[1] + (Math.random() - 0.5) * 40,
              Math.random() > 0.5 ? currentConfig.colors.comboAura : currentConfig.colors.comboCorona,
              { size: 4.5, velocityScale: 2.2, life: 0.5 }
            );
          }

          // Massive radial burst upon peak combo detonation
          if (triggeredExplosion) {
            particleSystem.spawnBurst(
              nextComboState.center[0],
              nextComboState.center[1],
              currentConfig.colors.comboAura,
              26,
              2.6,
              1.6
            );
            particleSystem.spawnBurst(
              nextComboState.center[0],
              nextComboState.center[1],
              currentConfig.colors.comboCorona,
              20,
              2.0,
              1.3
            );
          }
        }

        // 8. Render Dynamic Particle Trails
        drawParticleTrails(ctx, particleSystem.particles, currentConfig);

        // Restore un-shaken context for clean typography & HUD
        ctx.restore();

        // 9. Interactive Audio Event Triggers
        if (audioActiveRef.current) {
          // Shield chime
          const isShieldOn = shieldStateRef.current.currentAlpha > 0.3;
          if (isShieldOn && !prevShieldActiveRef.current) {
            vfxAudio.playShieldChime();
          }
          prevShieldActiveRef.current = isShieldOn;

          // Beam connect sound
          const isBeamOn = beamStateRef.current.beamAlpha > 0.3;
          if (isBeamOn && !prevBeamActiveRef.current) {
            vfxAudio.playBeamConnectSound();
          }
          prevBeamActiveRef.current = isBeamOn;

          // Sparks sound
          const activeSparks = Object.values(beamStateRef.current.joinAlphas).some(
            (a) => a > 0.35
          );
          if (activeSparks && !prevSparksActiveRef.current) {
            vfxAudio.playSparkSound();
          }
          prevSparksActiveRef.current = activeSparks;

          // Combo explosion / charge sound
          if (nextComboState.active && nextComboState.charge > 0.1) {
            vfxAudio.playComboOrbSound(nextComboState.charge);
          }
        }

        // 10. Determine Active Spell Name for HUD
        let activeSpellName = 'STANDBY / TRACKING';
        if (nextComboState.active && nextComboState.charge > 0.3) {
          activeSpellName = 'KAMEHAMEHA COMBO ORB';
        } else if (shieldStateRef.current.currentAlpha > 0.2) {
          activeSpellName = 'DR. STRANGE MAGIC SHIELD';
        } else if (Object.values(beamStateRef.current.joinAlphas).some((a) => a > 0.3)) {
          activeSpellName = 'FINGERTIP JOIN SPARKS';
        } else if (beamStateRef.current.beamAlpha > 0.2) {
          activeSpellName = 'NEON FINGERTIP BEAMS';
        } else if (landmarksList.length > 0 && currentConfig.enableAura) {
          activeSpellName = 'MYSTIC HAND AURA';
        }

        // Restore canvas from screen shake before drawing HUD overlay
        ctx.restore();

        // 11. Modern Post-Processing & Sleek HUD Overlay
        drawPostProcessingAndHUD(
          ctx,
          CANVAS_WIDTH,
          CANVAS_HEIGHT,
          currentConfig,
          {
            fps: avgFps,
            frameTimeMs: avgFrameMs,
            activeSpellName,
            confidence,
            velocity: overallVelocity,
            isAudioOn: audioActiveRef.current,
          }
        );

        // 12. Throttled UI Telemetry Snapshot Sync (~4Hz)
        if (now - lastTelemetryUpdate > 220) {
          lastTelemetryUpdate = now;
          const handsCount = landmarksList.length;
          const palmOpen = handsCount === 1 ? isPalmOpen(landmarksList[0]) : false;
          const shieldActive =
            currentConfig.enableShield && shieldStateRef.current.currentAlpha > 0.15;
          const beamActive =
            currentConfig.enableBeam && beamStateRef.current.beamAlpha > 0.15;
          const comboActive =
            currentConfig.enableComboOrb && nextComboState.active;
          const activeSparksCount = Object.values(
            beamStateRef.current.joinAlphas
          ).filter((a) => a > 0.25).length;

          setTelemetry({
            handsCount,
            palmOpen,
            shieldActive,
            beamActive,
            comboActive,
            comboCharge: nextComboState.charge,
            activeSparksCount,
            activeSpellName,
            fps: avgFps,
            frameTimeMs: avgFrameMs,
            confidence,
            velocity: overallVelocity,
            audioActive: audioActiveRef.current,
          });
        }
      }

      // Schedule next frame at native monitor refresh rate without artificial delay
      if (isMounted) {
        animationFrameId = window.requestAnimationFrame(renderFrame);
      }
    };

    animationFrameId = window.requestAnimationFrame(renderFrame);
    return () => {
      isMounted = false;
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Pointer dragging for interactive hand manipulation in Simulation Mode
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point2D => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return [
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top) * scaleY,
    ];
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Prime Web Audio on user canvas interaction
    vfxAudio.init();

    if (sourceModeRef.current !== 'simulation') return;
    const [mx, my] = getCanvasCoords(e);
    const hands = latestLandmarksRef.current;
    if (!hands || hands.length === 0) return;

    let closestHand: 'hand1' | 'hand2' = 'hand1';
    if (hands.length >= 2) {
      const c1 = getPalmCenter(hands[0]);
      const c2 = getPalmCenter(hands[1]);
      const d1 = Math.hypot(mx - c1[0], my - c1[1]);
      const d2 = Math.hypot(mx - c2[0], my - c2[1]);
      closestHand = d2 < d1 ? 'hand2' : 'hand1';
    }

    draggingHandRef.current = closestHand;
    dragStartMouseRef.current = [mx, my];
    dragStartOffsetRef.current = [...handOffsetsRef.current[closestHand]];
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const dragging = draggingHandRef.current;
    if (!dragging) return;
    const [mx, my] = getCanvasCoords(e);
    const dx = mx - dragStartMouseRef.current[0];
    const dy = my - dragStartMouseRef.current[1];
    handOffsetsRef.current[dragging] = [
      dragStartOffsetRef.current[0] + dx,
      dragStartOffsetRef.current[1] + dy,
    ];
  };

  const handlePointerUp = () => {
    draggingHandRef.current = null;
  };

  return (
    <div
      data-state="running"
      data-preset={activePreset}
      data-aura={config.enableAura ? 'on' : 'off'}
      data-beam={config.enableBeam ? 'on' : 'off'}
      data-shield={config.enableShield ? 'on' : 'off'}
      data-combo={config.enableComboOrb ? 'on' : 'off'}
      data-audio={audioActive ? 'on' : 'off'}
      className="min-h-screen bg-[#070911] text-slate-100 flex flex-col selection:bg-cyan-500/30"
    >
      {/* Top Application Header following Top Bar Contract */}
      <header className="h-14 px-4 lg:px-6 border-b border-slate-800/80 bg-[#0b0e18]/90 backdrop-blur flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 p-[1px] shadow-[0_0_16px_rgba(6,182,212,0.4)]">
            <div className="w-full h-full rounded-[11px] bg-slate-950/85 backdrop-blur flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.9)]" />
            </div>
          </div>
          <h1 className="flex items-center gap-2 m-0 p-0">
            <span className="text-base font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-cyan-100 to-cyan-400 whitespace-nowrap">
              AuraCraft
            </span>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 shadow-[0_0_8px_rgba(6,182,212,0.25)]">
              AI
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-300 border border-slate-700/60 ml-1 font-normal">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live VFX Engine
            </span>
          </h1>
        </div>

        {/* Clean nav / quick telemetry display */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-cyan-400" />
            Drag hands on canvas
          </span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
            <Video className="w-3.5 h-3.5 text-emerald-400" />
            1280×720 · {telemetry.fps.toFixed(1)} FPS
          </span>
        </div>

        {/* Primary Audio Toggle Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleAudio}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              audioActive
                ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {audioActive ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="whitespace-nowrap">Sound FX: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">Enable Sound</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Cinematic Full-Screen Stage */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-2 sm:p-4 pb-20 bg-[#05070e] overflow-hidden">
        <div className="w-full max-w-[1280px] aspect-video relative rounded-2xl overflow-hidden border border-slate-800/80 shadow-[0_0_60px_rgba(0,0,0,0.85)] bg-black">
          {/* Offscreen video element for active hardware-accelerated webcam decoding */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            width={1280}
            height={720}
            className="absolute pointer-events-none opacity-0 top-0 left-0 -z-50"
          />

          {/* Primary VFX Canvas */}
          <canvas
            ref={canvasRef}
            data-testid="vfx-canvas"
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full h-full object-contain cursor-grab active:cursor-grabbing touch-none"
          />
        </div>

        {/* Sleek, semi-transparent, non-intrusive bottom dock */}
        <ControlPanel
          sourceMode={sourceMode}
          onSourceModeChange={setSourceMode}
          webcamError={webcamError}
          activePreset={activePreset}
          onPresetChange={handlePresetChange}
          config={config}
          onToggleEffect={handleToggleEffect}
          onUpdateConfig={handleUpdateConfig}
          onResetConfig={handleResetConfig}
          beamSeparationOffset={beamSeparationOffset}
          onBeamSeparationChange={setBeamSeparationOffset}
          onResetHandPositions={handleResetHandPositions}
          telemetry={telemetry}
          onToggleAudio={handleToggleAudio}
        />
      </main>
    </div>
  );
}
