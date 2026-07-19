# Triple Oscilator

## Overview

A fully functional 3-oscillator subtractive synthesizer built entirely with the Web Audio API. It features an ADSR envelope, an LFO (with vibrato and tremolo modes), ring modulation, stereo spread, a 49-key on-screen piano keyboard, QWERTY input, and a real-time canvas-based envelope display. The entire UI — DOM controls, canvas visualisation, and piano keys — is generated programmatically from the entry point.

## Interaction

- **On-screen piano keys**: click or tap to play; velocity is determined by the vertical position within the key (bottom = louder). Drag across keys for glissando.
- **QWERTY keyboard**: the physical keyboard maps to notes C3–E5 across three rows. See `qwerty-input.ts` for the exact mapping.
- **Control panel**: 3 oscillator sections with waveform select (sine / sawtooth / square / triangle / noise), detune, octave, and volume. ADSR section with Attack, Decay, Sustain Level, Sustain Time, and Release sliders. LFO section with waveform, rate, amount, and target (vibrato / tremolo) controls.
- **ADSR display**: the canvas shows the envelope curve with animated dots tracking each held note's current envelope phase.

## How it works

### Audio engine (`audio-engine.ts`)

`AudioEngine` manages a single `AudioContext` and creates `Voice` instances. Each voice builds a synthesis graph containing:
- Up to 3 `OscillatorNode`s (or `AudioBufferSourceNode` for noise, fed from a pre-generated 2-second white-noise buffer).
- Each oscillator has its own `GainNode`.
- ADSR envelope applied via `setValueAtTime` / `linearRampToValueAtTime` on the master gain.
- **Ring modulation**: when enabled, OSC2's output modulates the gain of OSC3 via `osc2Node.connect(osc3GainNode.gain)`.
- **LFO**: an `OscillatorNode` running at the configured rate connects to either `.detune` of all oscillators (vibrato) or a dedicated tremolo gain node.
- **Stereo spread** (panning): OSC1 is detuned left (`−spread` cents), OSC3 detuned right (`+spread` cents), OSC2 centred.

The `release()` method cancels scheduled values and ramps gain to 0 over the configured release time, then disconnects the voice from the destination so it can be garbage-collected.

### State management (`state.ts`)

`SynthStore` is a central observable store holding `SynthParams` (3 oscillator configs, ADSR, LFO, spread). Any mutation (`updateOsc()`, `updateADSR()`, `updateSpread()`, `updateLFO()`) fires registered callbacks via an observer pattern, keeping the UI and audio engine synchronised without tight coupling.

### ADSR display (`adsr-display.ts`)

Canvas-based rendering of the envelope curve. Uses `canvas.getContext("2d")` to draw the segmented line: Attack rise, Decay fall, Sustain plateau, and Release fall. Cursor dots animate along the curve for each held note, following the elapsed time since `noteOn()`. The animation loop runs only while at least one note is active — it stops (via `cancelAnimationFrame`) when all notes have been released, conserving CPU.

### Keyboard (`keyboard-dom.ts`)

Generates 49 DOM elements (29 white keys, 20 black keys) laid out with CSS positioning. Handles `pointerdown`, `pointermove`, `pointerup`/`pointercancel` events. Velocity is computed as `1 − y / keyHeight` where `y` is the vertical offset of the pointer within the key bounds.

### QWERTY input (`qwerty-input.ts`)

Maps `KeyboardEvent.code` values to MIDI note numbers. The keyboard is organised as three rows covering C3 to E5:
- Top row (number keys + brackets): sharps/flats and the top C's sharp.
- Home row (A–L): natural notes C4–E5.
- Bottom row (Z–M): natural notes C3–B3.

Key repeat is suppressed by tracking active key codes. On `blur`, all held notes are released to prevent stuck notes.

## File structure

| File | Role |
|---|---|
| `main.ts` | Entry point — initialises all modules, wires observer to audio engine |
| `types.ts` | Shared type definitions (`SynthParams`, `OscillatorConfig`, `ADSRConfig`, `LFOConfig`) and `envelopeGainAt()` utility |
| `state.ts` | `SynthStore` — observable central state with `onChange()` callbacks |
| `audio-engine.ts` | `AudioEngine` + `Voice` — Web Audio API synthesis, ADSR, ring mod, LFO, stereo spread |
| `adsr-display.ts` | Canvas-based envelope curve renderer with per-note animated cursor dots |
| `keyboard-dom.ts` | 49-key on-screen piano keyboard with pointer/touch velocity detection |
| `controls-ui.ts` | DOM control panel (oscillator sections, ADSR sliders, LFO controls) |
| `qwerty-input.ts` | Physical keyboard-to-MIDI mapping, repeat suppression, blur cleanup |

## Technical notes

- The browser's autoplay policy prevents the `AudioContext` from starting before a user gesture. The applet shows an initial "Click or press a key to start" message and resumes the context on the first interaction.
- Ring modulation connects OSC2's output directly to OSC3's gain `.gain` AudioParam — this is a genuine audio-rate modulation, not a software simulation.
- Noise is generated from a fixed white-noise buffer rather than an `AudioWorkletNode` for simplicity and broad browser compatibility.
- The ADSR display animation loop is intentionally throttled: it only runs when notes are held, avoiding unnecessary canvas renders during silence.
