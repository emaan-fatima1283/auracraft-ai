# Hand-gesture-vfx

Real-time Hand Gesture VFX System ported from Python (`OpenCV` + `MediaPipe`) to a Web Application (`TypeScript` + `HTML5 Canvas` + `@mediapipe/tasks-vision`).

## Features Migrated from `main.py`
- **21-Landmark Hand Skeleton (`NeonRenderer`)**: Multi-pass additive neon bone rendering (Cyan for Hand 1, Magenta for Hand 2).
- **Pulsing Palm Aura (`NeonRenderer.draw_hand_aura`)**: 5 concentric pulsing rings centered on palm landmarks `[0, 5, 9, 13, 17]`.
- **RGB Fingertip Energy Beams (`BeamEffect`)**: Connects fingertips `[4, 8, 12, 16, 20]` across two hands with 6-layer neon glow and triggers additive energy bursts + 4-point star flares when fingertips come within `60px`.
- **Dr. Strange Magic Shield (`MagicShieldEffect`)**: Activates when 1 open hand is detected (fingertips extended past PIP joints), rendering rotating outer rings, an 8-sided octagon, a counter-rotating inner square, 12 radial connectors, a pulsing core, and 4 outer rune arcs.
- **Keyboard Shortcuts**: Press `A` (Aura), `B` (Beam), or `S` (Shield) to toggle effects in real time.
