/**
 * Web Audio API Sci-Fi Energy Synth Engine for Hand Gesture VFX
 * Generates rich procedural sci-fi energy hums, multi-oscillator formant resonance,
 * hand speed pitch-scaling, and celestial spell chimes.
 */

class VFXAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Rich Sci-Fi Drone Multi-Oscillator Architecture
  private subOsc: OscillatorNode | null = null;
  private subGain: GainNode | null = null;

  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private sciFiPlasmaOsc: OscillatorNode | null = null;

  private droneFilter: BiquadFilterNode | null = null;
  private formantFilter: BiquadFilterNode | null = null;

  private droneGain: GainNode | null = null;
  private isDroneRunning: boolean = false;

  // Sound cooldowns
  private lastShieldSoundTime: number = 0;
  private lastBeamSoundTime: number = 0;
  private lastSparkSoundTime: number = 0;
  private lastComboSoundTime: number = 0;

  constructor() {}

  public init(): boolean {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.45, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.startDrone();
      return true;
    } catch {
      return false;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.45, now + 0.05);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMasterVolume(volume: number) {
    if (this.masterGain && this.ctx && !this.isMuted) {
      const target = Math.max(0, Math.min(1, volume)) * 0.55;
      this.masterGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.05);
    }
  }

  private startDrone() {
    if (!this.ctx || !this.masterGain || this.isDroneRunning) return;

    try {
      const now = this.ctx.currentTime;

      // Primary Warm Low-Pass Resonant Filter
      this.droneFilter = this.ctx.createBiquadFilter();
      this.droneFilter.type = 'lowpass';
      this.droneFilter.frequency.setValueAtTime(340, now);
      this.droneFilter.Q.setValueAtTime(4.2, now);

      // Sci-Fi Formant Plasma Filter
      this.formantFilter = this.ctx.createBiquadFilter();
      this.formantFilter.type = 'bandpass';
      this.formantFilter.frequency.setValueAtTime(850, now);
      this.formantFilter.Q.setValueAtTime(5.5, now);

      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.09, now);

      // 1. Deep Sub-Bass Rumbler (45Hz - 90Hz) for movie-trailer weight
      this.subGain = this.ctx.createGain();
      this.subGain.gain.setValueAtTime(0.06, now);
      this.subOsc = this.ctx.createOscillator();
      this.subOsc.type = 'sine';
      this.subOsc.frequency.setValueAtTime(65.4, now); // C2
      this.subOsc.connect(this.subGain);
      this.subGain.connect(this.masterGain);

      // 2. Fundamental Dual Detuned Drone Oscillators (Sine + Triangle)
      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc1.type = 'sine';
      this.droneOsc1.frequency.setValueAtTime(130.81, now); // C3

      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc2.type = 'triangle';
      this.droneOsc2.frequency.setValueAtTime(131.6, now); // detuned C3

      // 3. Sci-Fi Plasma Sawtooth Harmonic (gives futuristic energy thrum)
      this.sciFiPlasmaOsc = this.ctx.createOscillator();
      this.sciFiPlasmaOsc.type = 'sawtooth';
      this.sciFiPlasmaOsc.frequency.setValueAtTime(196.0, now); // G3 5th harmonic

      // Routing
      this.droneOsc1.connect(this.droneFilter);
      this.droneOsc2.connect(this.droneFilter);
      this.sciFiPlasmaOsc.connect(this.formantFilter);

      this.formantFilter.connect(this.droneGain);
      this.droneFilter.connect(this.droneGain);
      this.droneGain.connect(this.masterGain);

      this.subOsc.start();
      this.droneOsc1.start();
      this.droneOsc2.start();
      this.sciFiPlasmaOsc.start();

      this.isDroneRunning = true;
    } catch {
      // Audio autoplay may still be pending
    }
  }

  /**
   * Modulates background sci-fi hum according to hand movement speed.
   * Faster hand movements scale pitch from a deep energy hum up to a high-voltage laser crescendo.
   * @param speed Pixels per second (0 - 1500)
   * @param handsDetected Number of tracked hands
   */
  public updateMovement(speed: number, handsDetected: number) {
    if (!this.ctx || !this.isDroneRunning || this.isMuted) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
      return;
    }

    const now = this.ctx.currentTime;
    // Normalized speed curve with exponential response
    const normSpeed = Math.min(1.0, Math.max(0, speed / 850));
    const speedCurve = Math.pow(normSpeed, 1.3);

    // Fundamental glides smoothly from 110Hz (A2) up to ~380Hz (G4) on fast sweeps
    const targetFreq = 110 + speedCurve * 270;
    const subFreq = targetFreq * 0.5;
    const plasmaFreq = targetFreq * 1.5;

    // Filters open up dramatically when hands move fast
    const targetFilter = 260 + speedCurve * 1100 + (handsDetected > 0 ? 120 : 0);
    const targetFormant = 650 + speedCurve * 1400;
    const targetVolume = handsDetected > 0 ? 0.08 + speedCurve * 0.16 : 0.025;
    const subVolume = handsDetected > 0 ? 0.05 + speedCurve * 0.08 : 0.015;

    if (this.droneOsc1 && this.droneOsc2) {
      this.droneOsc1.frequency.setTargetAtTime(targetFreq, now, 0.06);
      this.droneOsc2.frequency.setTargetAtTime(targetFreq * 1.006, now, 0.06);
    }
    if (this.subOsc) {
      this.subOsc.frequency.setTargetAtTime(subFreq, now, 0.06);
    }
    if (this.sciFiPlasmaOsc) {
      this.sciFiPlasmaOsc.frequency.setTargetAtTime(plasmaFreq, now, 0.06);
    }
    if (this.droneFilter) {
      this.droneFilter.frequency.setTargetAtTime(targetFilter, now, 0.06);
    }
    if (this.formantFilter) {
      this.formantFilter.frequency.setTargetAtTime(targetFormant, now, 0.06);
    }
    if (this.droneGain) {
      this.droneGain.gain.setTargetAtTime(targetVolume, now, 0.08);
    }
    if (this.subGain) {
      this.subGain.gain.setTargetAtTime(subVolume, now, 0.08);
    }
  }

  /**
   * Dr. Strange Shield Activation harmonic bell chime
   */
  public playShieldChime() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastShieldSoundTime < 0.6) return;
    this.lastShieldSoundTime = now;

    try {
      const frequencies = [392, 523.25, 659.25, 783.99]; // G4, C5, E5, G5 celestial chord
      frequencies.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.09 / (idx + 1), now + idx * 0.04 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9 + idx * 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + idx * 0.04);
        osc.stop(now + 1.2);
      });
    } catch {
      // Ignored
    }
  }

  /**
   * Fingertip Beams connecting electric pulse
   */
  public playBeamConnectSound() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastBeamSoundTime < 0.8) return;
    this.lastBeamSoundTime = now;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.3);
      filter.Q.setValueAtTime(6.0, now);

      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.55);
    } catch {
      // Ignored
    }
  }

  /**
   * High-energy spark flash sound when fingertips touch within 60px
   */
  public playSparkSound() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastSparkSoundTime < 0.18) return;
    this.lastSparkSoundTime = now;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const freq = 1200 + Math.random() * 800;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.08);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Ignored
    }
  }

  /**
   * Dual-Hand Combo Kamehameha / Plasma Orb pulsating sub-bass & power surge
   */
  public playComboOrbSound(chargeLevel: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastComboSoundTime < 0.22) return;
    this.lastComboSoundTime = now;

    try {
      // Sub-bass rumble
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const basePitch = 60 + chargeLevel * 95;
      osc.frequency.setValueAtTime(basePitch, now);
      osc.frequency.linearRampToValueAtTime(basePitch + 25, now + 0.2);

      const amp = 0.05 + chargeLevel * 0.15;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(amp, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.32);

      // Shimmering overtone when heavily charged
      if (chargeLevel > 0.55) {
        const ping = this.ctx.createOscillator();
        const pingGain = this.ctx.createGain();
        ping.type = 'triangle';
        ping.frequency.setValueAtTime(880 + chargeLevel * 450, now);
        pingGain.gain.setValueAtTime(0.045, now);
        pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        ping.connect(pingGain);
        pingGain.connect(this.masterGain);
        ping.start(now);
        ping.stop(now + 0.26);
      }
    } catch {
      // Ignored
    }
  }
}

export const vfxAudio = new VFXAudioEngine();
