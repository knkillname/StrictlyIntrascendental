import type { SynthParams, OscillatorConfig, ADSRConfig, LFOConfig } from "./types.js";

const DEFAULTS: SynthParams = {
    osc: [
        { type: "square", detune: 0, volume: 0.8, octave: 0, ringMod: false },
        { type: "triangle", detune: 10, volume: 0.6, octave: 0, ringMod: false },
        { type: "sine", detune: -10, volume: 0.4, octave: 0, ringMod: false },
    ],
    adsr: {
        attack: 0,
        decay: 0.2,
        sustainLevel: 0.4,
        sustainTime: 1,
        release: 0.5,
    },
    spread: 0,
    lfo: {
        rate: 5,
        depth: 0.1,
        waveform: "sine",
        target: "tremolo",
    },
};

function cloneParams(p: SynthParams): SynthParams {
    return {
        osc: [
            { ...p.osc[0] },
            { ...p.osc[1] },
            { ...p.osc[2] },
        ],
        adsr: { ...p.adsr },
        spread: p.spread,
        lfo: { ...p.lfo },
    };
}

export type ChangeCallback = (params: SynthParams) => void;

export class SynthStore {
    params: SynthParams;
    private listeners = new Set<ChangeCallback>();

    constructor() {
        this.params = cloneParams(DEFAULTS);
    }

    updateOsc(index: 0 | 1 | 2, partial: Partial<OscillatorConfig>): void {
        this.params.osc[index] = { ...this.params.osc[index], ...partial };
        this.notify();
    }

    updateADSR(partial: Partial<ADSRConfig>): void {
        this.params.adsr = { ...this.params.adsr, ...partial };
        this.notify();
    }

    onChange(cb: ChangeCallback): void {
        this.listeners.add(cb);
        cb(this.params);
    }

    updateSpread(value: number): void {
        this.params.spread = value;
        this.notify();
    }

    updateLFO(partial: Partial<LFOConfig>): void {
        this.params.lfo = { ...this.params.lfo, ...partial };
        this.notify();
    }

    private notify(): void {
        for (const cb of this.listeners) cb(this.params);
    }
}
