import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bgrToRgb,
  createDefaultConfig,
  createInitialBeamState,
  createInitialComboOrbState,
  createInitialShieldState,
  generateSimulatedHands,
  getPalmCenter,
  HandTrackerSmoother,
  isPalmOpen,
  ParticleTrailSystem,
  updateBeamState,
  updateComboOrbState,
  updateShieldState,
} from './engine';

test('bgrToRgb converts OpenCV BGR color tuples to RGB accurately', () => {
  // Shield color in main.py: BGR (0, 140, 255) -> RGB (255, 140, 0)
  assert.deepEqual(bgrToRgb([0, 140, 255]), [255, 140, 0]);
  // Cyan in main.py: BGR (255, 255, 0) -> RGB (0, 255, 255)
  assert.deepEqual(bgrToRgb([255, 255, 0]), [0, 255, 255]);
});

test('isPalmOpen detects open palm vs closed fist accurately', () => {
  const openHands = generateSimulatedHands('shield_open_palm', 1280, 720, 0);
  assert.equal(openHands.length, 1);
  assert.equal(isPalmOpen(openHands[0]), true);

  const fistHands = generateSimulatedHands('closed_fist', 1280, 720, 0);
  assert.equal(fistHands.length, 1);
  assert.equal(isPalmOpen(fistHands[0]), false);
});

test('getPalmCenter computes average of palm landmarks [0, 5, 9, 13, 17]', () => {
  const hands = generateSimulatedHands('shield_open_palm', 1280, 720, 0);
  const center = getPalmCenter(hands[0]);
  assert.ok(center[0] > 550 && center[0] < 730);
  assert.ok(center[1] > 300 && center[1] < 460);
});

test('updateShieldState activates only when 1 hand with open palm is present', () => {
  const openHands = generateSimulatedHands('shield_open_palm', 1280, 720, 0);
  let state = createInitialShieldState();

  // Step 0.2s with 1 open hand -> alpha increases toward 1.0
  state = updateShieldState(state, 0.2, openHands);
  assert.equal(state.isOpenPalmDetected, true);
  assert.ok(state.currentAlpha > 0.8);
  assert.ok(state.lastCenter !== null);

  // When 2 hands are detected, shield fades out (main.py: len(landmarks_list) == 1)
  const twoHands = generateSimulatedHands('dual_beams', 1280, 720, 0);
  state = updateShieldState(state, 0.1, twoHands);
  assert.equal(state.isOpenPalmDetected, false);
  assert.ok(state.currentAlpha < 1.0);
});

test('updateBeamState activates with 2 hands and triggers join sparks below distance threshold', () => {
  const config = createDefaultConfig();
  let beamState = createInitialBeamState();

  // Distant 2 hands -> beamAlpha increases, joinAlphas remain 0
  const distantHands = generateSimulatedHands('dual_beams', 1280, 720, 0);
  beamState = updateBeamState(beamState, 0.3, distantHands, config);
  assert.ok(beamState.beamAlpha > 0.5);
  assert.equal(beamState.joinAlphas[8], 0);

  // Close 2 hands (fingertip_sparks preset) -> all 5 joinAlphas increase above 0.5
  const sparkHands = generateSimulatedHands('fingertip_sparks', 1280, 720, 0);
  beamState = updateBeamState(beamState, 0.25, sparkHands, config);
  const activeSparks = Object.values(beamState.joinAlphas).filter((a) => a > 0.5);
  assert.equal(activeSparks.length, 5, 'Expected all 5 fingertip pairs within 60px threshold');
  assert.deepEqual(config.colors.primary, [0, 255, 255]);
});

test('HandTrackerSmoother applies linear interpolation (lerp) smoothly across frames', () => {
  const smoother = new HandTrackerSmoother();
  const handsFrame1 = generateSimulatedHands('shield_open_palm', 1280, 720, 0);
  const result1 = smoother.update(handsFrame1, 0.016, 0.5);
  assert.equal(result1.smoothed.length, 1);
  assert.equal(result1.smoothed[0].length, 21);

  // Offset hand in frame 2
  const handsFrame2 = handsFrame1.map((h) => h.map(([x, y]) => [x + 50, y + 30] as [number, number]));
  const result2 = smoother.update(handsFrame2, 0.016, 0.5);

  // Smoothed position should be between frame 1 and target frame 2
  const p1 = handsFrame1[0][0][0];
  const p2Target = handsFrame2[0][0][0];
  const p2Smoothed = result2.smoothed[0][0][0];

  assert.ok(p2Smoothed > p1, 'Smoothed landmark should move toward target');
  assert.ok(p2Smoothed < p2Target, 'Smoothed landmark should lerp smoothly without overshoot');
  assert.ok(result2.overallVelocity > 0, 'Velocity should be computed during movement');
});

test('updateComboOrbState charges and triggers Kamehameha plasma explosion when 2 hands are close', () => {
  const config = createDefaultConfig();
  let comboState = createInitialComboOrbState();
  const comboHands = generateSimulatedHands('combo_plasma_orb', 1280, 720, 0);

  assert.equal(comboHands.length, 2);
  const { state: updated1 } = updateComboOrbState(comboState, 0.2, comboHands, config);

  assert.equal(updated1.active, true);
  assert.ok(updated1.charge > 0.4);
  assert.ok(updated1.center !== null);

  // Second step reaches explosion charge threshold
  const { state: updated2, triggeredExplosion } = updateComboOrbState(updated1, 0.3, comboHands, config);
  assert.ok(updated2.charge >= 0.85);
  assert.equal(triggeredExplosion, true, 'Should trigger explosion flash at full charge');
  assert.ok(updated2.shockwaves.length > 0, 'Shockwaves should be generated');
});

test('ParticleTrailSystem spawns and updates particles with velocity decay and fadeout', () => {
  const system = new ParticleTrailSystem();
  system.spawn(640, 360, [0, 255, 255], { size: 4, life: 0.5 });
  assert.equal(system.particles.length, 1);

  const initialVx = system.particles[0].vx;
  system.update(0.1, 0.94);

  assert.equal(system.particles.length, 1);
  assert.ok(Math.abs(system.particles[0].vx) <= Math.abs(initialVx), 'Velocity should decay');
  assert.ok(system.particles[0].alpha < 0.9, 'Alpha should fade out naturally');
});
