import React, { useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Cpu,
  Flame,
  Hand,
  RotateCcw,
  Shield,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { GesturePresetId, VFXConfig } from '../vfx/engine';

export interface TelemetrySnapshot {
  handsCount: number;
  palmOpen: boolean;
  shieldActive: boolean;
  beamActive: boolean;
  comboActive: boolean;
  comboCharge: number;
  activeSparksCount: number;
  activeSpellName: string;
  fps: number;
  frameTimeMs: number;
  confidence: number;
  velocity: number;
  audioActive: boolean;
}

interface ControlPanelProps {
  sourceMode: 'simulation' | 'webcam';
  onSourceModeChange: (mode: 'simulation' | 'webcam') => void;
  webcamError: string | null;
  activePreset: GesturePresetId;
  onPresetChange: (preset: GesturePresetId) => void;
  config: VFXConfig;
  onToggleEffect: (
    key:
      | 'enableAura'
      | 'enableBeam'
      | 'enableShield'
      | 'enableSkeleton'
      | 'enableParticles'
      | 'enableComboOrb'
  ) => void;
  onUpdateConfig: <K extends keyof VFXConfig>(key: K, value: VFXConfig[K]) => void;
  onResetConfig: () => void;
  beamSeparationOffset: number;
  onBeamSeparationChange: (offset: number) => void;
  onResetHandPositions: () => void;
  telemetry: TelemetrySnapshot;
  onToggleAudio: () => void;
}

const PRESET_BUTTONS: Array<{
  id: GesturePresetId;
  label: string;
  shortLabel: string;
}> = [
  { id: 'combo_plasma_orb', label: 'Combo Orb', shortLabel: '💥 Combo' },
  { id: 'shield_open_palm', label: 'Shield', shortLabel: '🛡️ Shield' },
  { id: 'dual_beams', label: 'Beams', shortLabel: '⚡ Beams' },
  { id: 'fingertip_sparks', label: 'Sparks', shortLabel: '✨ Sparks' },
  { id: 'closed_fist', label: 'Fist', shortLabel: '✊ Fist' },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  sourceMode,
  onSourceModeChange,
  webcamError,
  activePreset,
  onPresetChange,
  config,
  onToggleEffect,
  onUpdateConfig,
  onResetConfig,
  beamSeparationOffset,
  onBeamSeparationChange,
  onResetHandPositions,
  telemetry,
  onToggleAudio,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div
      aria-label="VFX Bottom Dock Controller"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[96%] max-w-5xl z-30 flex flex-col transition-all duration-200"
    >
      {/* Semi-transparent Glass Container */}
      <div className="bg-[#0b0e1b]/85 backdrop-blur-xl border border-slate-700/60 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.65)] overflow-hidden">
        {/* Compact Primary Horizontal Bar */}
        <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2.5">
          {/* Active Spell & Live Metrics */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                telemetry.comboActive
                  ? 'bg-fuchsia-400 shadow-[0_0_12px_#ff00ff]'
                  : telemetry.shieldActive
                  ? 'bg-amber-400 shadow-[0_0_12px_#ffaa00]'
                  : telemetry.beamActive
                  ? 'bg-cyan-400 shadow-[0_0_12px_#00ffff]'
                  : 'bg-slate-500'
              }`}
            />
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-bold text-slate-100 tracking-wide truncate max-w-[170px] sm:max-w-[210px]">
                {telemetry.activeSpellName}
              </span>
              <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                {telemetry.fps.toFixed(0)} FPS · {Math.round(telemetry.velocity)} px/s
              </span>
            </div>
          </div>

          {/* Quick Preset Buttons (in Simulation Mode) */}
          {sourceMode === 'simulation' ? (
            <div
              className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800"
              role="group"
              aria-label="Gesture Presets"
            >
              {PRESET_BUTTONS.map((preset) => {
                const isSelected = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onPresetChange(preset.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {preset.shortLabel}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-amber-300/90 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/25">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              Live Camera Feed Active
            </div>
          )}

          {/* Quick Effect Layer Toggles */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleEffect('enableComboOrb')}
              title="Toggle Kamehameha Combo Orb"
              aria-pressed={config.enableComboOrb}
              className={`p-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                config.enableComboOrb
                  ? 'bg-fuchsia-500/20 border-fuchsia-400/50 text-fuchsia-200'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-fuchsia-400" />
            </button>

            <button
              type="button"
              onClick={() => onToggleEffect('enableParticles')}
              title="Toggle Magic Dust Trails"
              aria-pressed={config.enableParticles}
              className={`p-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                config.enableParticles
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </button>

            <button
              type="button"
              onClick={() => onToggleEffect('enableShield')}
              title="Toggle Dr. Strange Shield (S)"
              aria-pressed={config.enableShield}
              className={`p-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                config.enableShield
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
            </button>

            <button
              type="button"
              onClick={() => onToggleEffect('enableBeam')}
              title="Toggle Fingertip Beams (B)"
              aria-pressed={config.enableBeam}
              className={`p-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                config.enableBeam
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
            </button>

            <button
              type="button"
              onClick={() => onToggleEffect('enableAura')}
              title="Toggle Hand Aura (A)"
              aria-pressed={config.enableAura}
              className={`p-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                config.enableAura
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-cyan-400" />
            </button>

            <button
              type="button"
              onClick={() => onToggleEffect('enableSkeleton')}
              title="Toggle Hand Skeleton"
              aria-pressed={config.enableSkeleton}
              className={`p-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                config.enableSkeleton
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Hand className="w-3.5 h-3.5 text-emerald-400" />
            </button>

            <div className="w-px h-5 bg-slate-800 mx-0.5" />

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={onToggleAudio}
              title={telemetry.audioActive ? 'Mute Audio Synth' : 'Enable Audio Synth (M)'}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                telemetry.audioActive
                  ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {telemetry.audioActive ? (
                <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Expand / Fine-Tune Tuning Drawer */}
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-medium cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Tuning</span>
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronUp className="w-3 h-3 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable Precision Tuning Drawer */}
        {isExpanded && (
          <div className="px-4 py-3 border-t border-slate-800/80 bg-slate-950/70 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Column 1: Input Mode & Motion */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  Tracking Pipeline
                </span>
                <span className="font-mono text-cyan-400">0.40 Conf</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onSourceModeChange('simulation')}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                    sourceMode === 'simulation'
                      ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Simulated
                </button>
                <button
                  type="button"
                  onClick={() => onSourceModeChange('webcam')}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                    sourceMode === 'webcam'
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Live Webcam
                </button>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <label htmlFor="lerp-tuning-slider" className="text-slate-300">
                    Lerp Motion Smoothing
                  </label>
                  <span className="font-mono text-cyan-300">
                    {Math.round(config.lerpSmoothness * 100)}%
                  </span>
                </div>
                <input
                  id="lerp-tuning-slider"
                  type="range"
                  min={0.15}
                  max={1.0}
                  step={0.05}
                  value={config.lerpSmoothness}
                  onChange={(e) => onUpdateConfig('lerpSmoothness', Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Column 2: Combo & Sparks Sensitivity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-fuchsia-400" />
                  Combo & Sparks Threshold
                </span>
                <span className="font-mono text-fuchsia-400">{config.comboDistanceThreshold}px</span>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <label htmlFor="combo-dist-slider" className="text-slate-300">
                    Combo Orb Activation Distance
                  </label>
                  <span className="font-mono text-fuchsia-300">{config.comboDistanceThreshold}px</span>
                </div>
                <input
                  id="combo-dist-slider"
                  type="range"
                  min={120}
                  max={340}
                  step={10}
                  value={config.comboDistanceThreshold}
                  onChange={(e) =>
                    onUpdateConfig('comboDistanceThreshold', Number(e.target.value))
                  }
                  className="w-full accent-fuchsia-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <label htmlFor="spark-dist-slider" className="text-slate-300">
                    Fingertip Spark Threshold
                  </label>
                  <span className="font-mono text-fuchsia-300">
                    {config.joinEffectDistanceThreshold}px
                  </span>
                </div>
                <input
                  id="spark-dist-slider"
                  type="range"
                  min={30}
                  max={150}
                  step={5}
                  value={config.joinEffectDistanceThreshold}
                  onChange={(e) =>
                    onUpdateConfig('joinEffectDistanceThreshold', Number(e.target.value))
                  }
                  className="w-full accent-fuchsia-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Column 3: Shield & Glow Tuning */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-amber-400" />
                  Shield & Glow Intensity
                </span>
                <button
                  type="button"
                  onClick={onResetConfig}
                  className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Reset
                </button>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <label htmlFor="shield-radius-input" className="text-slate-300">
                    Shield Radius
                  </label>
                  <span className="font-mono text-amber-300">{config.shieldRadius}px</span>
                </div>
                <input
                  id="shield-radius-input"
                  type="range"
                  min={70}
                  max={200}
                  step={5}
                  value={config.shieldRadius}
                  onChange={(e) => onUpdateConfig('shieldRadius', Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <label htmlFor="glow-intensity-input" className="text-slate-300">
                    Neon Glow Bloom Passes
                  </label>
                  <span className="font-mono text-cyan-300">{config.glowIntensity}</span>
                </div>
                <input
                  id="glow-intensity-input"
                  type="range"
                  min={2}
                  max={10}
                  step={1}
                  value={config.glowIntensity}
                  onChange={(e) => onUpdateConfig('glowIntensity', Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Webcam Error Banner if needed */}
        {webcamError && (
          <div className="px-3 py-2 bg-rose-950/70 border-t border-rose-500/40 text-xs text-rose-200 flex items-center justify-between">
            <span>{webcamError}</span>
            <button
              type="button"
              onClick={() => onSourceModeChange('simulation')}
              className="text-[11px] font-semibold text-cyan-300 underline hover:text-cyan-200 ml-2 cursor-pointer"
            >
              Return to Studio
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
