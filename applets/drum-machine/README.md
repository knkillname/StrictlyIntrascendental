# Drum Machine

TR-808-style synthetic drum machine built with the Web Audio API.

## Sounds (11)

| Sound | Synthesis |
|---|---|
| Bass Drum | Sine oscillator with frequency sweep (150→40 Hz) + noise transient |
| Snare | Sine oscillator (180 Hz) + white noise through band-pass filter (1 kHz) |
| Low/Mid/High Tom | Sine oscillator with descending frequency sweep |
| Closed/Open Hi-hat | White noise through high-pass filter (7 kHz), short/long decay |
| Clap | White noise with 3 gain bursts |
| Rim Shot | Two sine oscillators (1 kHz and 1.8 kHz) |
| Cowbell | Two square oscillators (540 Hz and 800 Hz) |
| Cymbal | White noise through band-pass filter + metallic oscillator (3.5 kHz) |

## How to use

1. Open `dist/drum-machine.html` in your browser.
2. Click **PLAY** to start the sequencer.
3. Toggle steps on/off by clicking the grid cells.
4. Trigger sounds manually with the `●` buttons next to each instrument.
5. Adjust BPM (40–220) and per-instrument volume.

## Choke

The Open Hi-hat is automatically cut off when the Closed Hi-hat is triggered (just like the real TR-808).
