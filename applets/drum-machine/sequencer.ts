import { DRUM_SOUNDS } from "./types.js";
import type { AudioEngine } from "./audio-engine.js";
import type { DrumStore } from "./state.js";

const LOOKAHEAD_MS = 50;
const INTERVAL_MS = 25;

export class Sequencer {
    private timerId: ReturnType<typeof setInterval> | null = null;
    private nextStep = 0;
    private nextTime = 0;
    private bpm = 120;

    constructor(
        private store: DrumStore,
        private audio: AudioEngine,
    ) { }

    start(): void {
        this.store.setPlaying(true);
        const ctx = (this.audio as any).ctx as AudioContext | null;
        this.nextTime = ctx?.currentTime ?? 0;
        this.nextStep = 0;
        this.timerId = setInterval(() => this.tick(), INTERVAL_MS);
    }

    stop(): void {
        if (this.timerId !== null) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.store.setPlaying(false);
    }

    setBPM(bpm: number): void {
        this.bpm = bpm;
        if (this.timerId !== null) {
            // Restart timer with new BPM — playback continues
            this.stop();
            this.start();
        }
    }

    private tick(): void {
        const ctx = (this.audio as any).ctx as AudioContext | null;
        if (!ctx) return;
        const now = ctx.currentTime;
        const lookahead = LOOKAHEAD_MS / 1000;
        const stepDur = 60 / this.bpm / 4; // 16th note duration

        // Schedule upcoming steps within lookahead window
        while (this.nextTime < now + lookahead) {
            const state = this.store.state;
            if (state.currentStep !== (this.nextStep - 1 + 16) % 16 && state.currentStep !== -1) {
                // If store's currentStep diverges (shouldn't happen normally), sync
            }
            for (const sound of DRUM_SOUNDS) {
                if (state.steps[sound][this.nextStep]) {
                    this.audio.triggerSound(sound, 0.8);
                }
            }
            // Advance store step indicator at the moment the step fires
            this.store.advanceStep();
            this.nextStep = (this.nextStep + 1) % 16;
            this.nextTime += stepDur;
        }
    }
}
