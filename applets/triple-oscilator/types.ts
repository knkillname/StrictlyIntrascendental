export type Waveform = "sine" | "square" | "sawtooth" | "triangle" | "noise";

export interface OscillatorConfig {
    type: Waveform;
    detune: number;
    volume: number;
}

export interface ADSRConfig {
    attack: number;
    decay: number;
    sustainLevel: number;
    sustainTime: number;
    release: number;
}

export interface SynthParams {
    osc: [OscillatorConfig, OscillatorConfig, OscillatorConfig];
    adsr: ADSRConfig;
}
