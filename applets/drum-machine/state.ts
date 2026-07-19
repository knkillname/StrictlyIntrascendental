import type { DrumMachineState, DrumSound } from "./types.js";
import { DRUM_SOUNDS, createDefaultState } from "./types.js";

export type ChangeCallback = (state: DrumMachineState) => void;

export class DrumStore {
    private st: DrumMachineState;
    private listeners = new Set<ChangeCallback>();
    /** Callback invoked when the sequencer step changes externally */
    onStepChange: ((step: number) => void) | null = null;

    constructor() {
        this.st = createDefaultState();
    }

    get state(): DrumMachineState {
        return this.st;
    }

    toggleStep(sound: DrumSound, step: number): void {
        const arr = [...this.st.steps[sound]];
        arr[step] = !arr[step];
        this.st = { ...this.st, steps: { ...this.st.steps, [sound]: arr } };
        this.notify();
    }

    clearAllSteps(): void {
        const steps = {} as Record<DrumSound, readonly boolean[]>;
        for (const s of DRUM_SOUNDS) steps[s] = new Array<boolean>(16).fill(false);
        this.st = { ...this.st, steps };
        this.notify();
    }

    setStep(sound: DrumSound, step: number, value: boolean): void {
        const arr = [...this.st.steps[sound]];
        arr[step] = value;
        this.st = { ...this.st, steps: { ...this.st.steps, [sound]: arr } };
        this.notify();
    }

    setBPM(bpm: number): void {
        this.st = { ...this.st, bpm: Math.max(40, Math.min(220, bpm)) };
        this.notify();
    }

    setPlaying(playing: boolean): void {
        this.st = { ...this.st, playing, currentStep: playing ? this.st.currentStep : -1 };
        this.notify();
    }

    advanceStep(): void {
        const next = (this.st.currentStep + 1) % 16;
        this.st = { ...this.st, currentStep: next };
        this.onStepChange?.(next);
        this.notify();
    }

    setVolume(sound: DrumSound, volume: number): void {
        this.st = {
            ...this.st,
            volumes: { ...this.st.volumes, [sound]: Math.max(0, Math.min(1, volume)) },
        };
        this.notify();
    }

    setMasterVolume(volume: number): void {
        this.st = { ...this.st, masterVolume: Math.max(0, Math.min(1, volume)) };
        this.notify();
    }

    onChange(cb: ChangeCallback): void {
        this.listeners.add(cb);
        cb(this.st);
    }

    private notify(): void {
        for (const cb of this.listeners) cb(this.st);
    }
}
