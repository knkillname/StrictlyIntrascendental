export type Waveform = "sine" | "square" | "sawtooth" | "triangle" | "noise" | "randomwalk";
export type LFOWaveform = "sine" | "triangle" | "square" | "sawtooth";
export type LFOTarget = "off" | "vibrato" | "tremolo";

export interface OscillatorConfig {
    type: Waveform;
    detune: number;
    volume: number;
    octave: number;
    ringMod: boolean;
}

export interface ADSRConfig {
    attack: number;
    decay: number;
    sustainLevel: number;
    sustainTime: number;
    release: number;
}

export interface LFOConfig {
    rate: number;
    depth: number;
    waveform: LFOWaveform;
    target: LFOTarget;
}

export interface SynthParams {
    osc: [OscillatorConfig, OscillatorConfig, OscillatorConfig];
    adsr: ADSRConfig;
    spread: number;
    lfo: LFOConfig;
}

export function envelopeGainAt(elapsed: number, a: ADSRConfig): number {
    const total = a.attack + a.decay + a.sustainTime + a.release;
    if (total <= 0) return 0;
    let t = Math.max(0, Math.min(elapsed, total));
    if (t < a.attack) return a.attack > 0 ? t / a.attack : 1;
    t -= a.attack;
    if (t < a.decay) return 1 + (t / (a.decay || 0.001)) * (a.sustainLevel - 1);
    t -= a.decay;
    if (t < a.sustainTime) return a.sustainLevel;
    t -= a.sustainTime;
    if (t < a.release) return a.sustainLevel * (1 - t / (a.release || 0.001));
    return 0;
}
