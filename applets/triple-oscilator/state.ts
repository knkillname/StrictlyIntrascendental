import type { SynthParams, OscillatorConfig, ADSRConfig } from "./types.js";

const DEFAULTS: SynthParams = {
    osc: [
        { type: "square", detune: 0, volume: 0.8 },
        { type: "triangle", detune: 10, volume: 0.6 },
        { type: "sine", detune: -10, volume: 0.4 },
    ],
    adsr: {
        attack: 0,
        decay: 0.2,
        sustainLevel: 0.4,
        sustainTime: 1,
        release: 0.5,
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

    private notify(): void {
        for (const cb of this.listeners) cb(this.params);
    }
}
