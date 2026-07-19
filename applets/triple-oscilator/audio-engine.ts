import type { SynthParams } from "./types.js";

export function midiToFrequency(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

interface SourceEntry {
    node: OscillatorNode | AudioBufferSourceNode;
    gainNode: GainNode;
    isNoise: boolean;
    index: number;
}

export class Voice {
    private sources: SourceEntry[] = [];
    private envGain: GainNode;
    private ctx: AudioContext;
    private releaseSec: number;

    constructor(
        ctx: AudioContext,
        freq: number,
        params: SynthParams,
        startTime: number,
        noiseBuffer: AudioBuffer,
        masterGain: GainNode,
    ) {
        this.ctx = ctx;
        this.releaseSec = params.adsr.release;
        this.envGain = ctx.createGain();
        this.envGain.gain.setValueAtTime(0, startTime);
        this.envGain.connect(masterGain);

        for (let i = 0; i < 3; i++) {
            const cfg = params.osc[i];
            const gainNode = ctx.createGain();
            gainNode.gain.value = cfg.volume;

            if (cfg.type === "noise") {
                const noise = ctx.createBufferSource();
                noise.buffer = noiseBuffer;
                noise.loop = true;
                noise.connect(gainNode);
                noise.start(startTime);
                gainNode.connect(this.envGain);
                this.sources.push({ node: noise, gainNode, isNoise: true, index: i });
            } else {
                const osc = ctx.createOscillator();
                osc.type = cfg.type;
                osc.frequency.setValueAtTime(freq, startTime);
                osc.detune.setValueAtTime(cfg.detune, startTime);
                osc.connect(gainNode);
                gainNode.connect(this.envGain);
                osc.start(startTime);
                this.sources.push({ node: osc, gainNode, isNoise: false, index: i });
            }
        }

        const a = params.adsr;
        const attackEnd = startTime + a.attack;
        const decayEnd = attackEnd + a.decay;
        const sustainEnd = decayEnd + a.sustainTime;
        const gain = this.envGain.gain;
        gain.cancelScheduledValues(startTime);
        gain.setValueAtTime(0, startTime);
        gain.linearRampToValueAtTime(1, attackEnd);
        gain.linearRampToValueAtTime(a.sustainLevel, decayEnd);
        gain.setValueAtTime(a.sustainLevel, sustainEnd);
        gain.linearRampToValueAtTime(0, sustainEnd + a.release);
    }

    release(stopTime?: number): void {
        const now = stopTime ?? this.ctx.currentTime;
        const gain = this.envGain.gain;
        gain.cancelScheduledValues(now);
        const currentGain = gain.value;
        if (currentGain > 0.001) {
            gain.setValueAtTime(currentGain, now);
            gain.linearRampToValueAtTime(0, now + this.releaseSec);
        } else {
            gain.setValueAtTime(0, now);
        }
        const stopAt = now + this.releaseSec + 0.05;
        for (const s of this.sources) {
            try { s.node.stop(stopAt); } catch { /* already stopped */ }
        }
        setTimeout(() => this.disconnect(), (this.releaseSec + 0.1) * 1000);
    }

    updateParams(params: SynthParams): void {
        this.releaseSec = params.adsr.release;
        const now = this.ctx.currentTime;
        for (const s of this.sources) {
            const cfg = params.osc[s.index];
            s.gainNode.gain.value = cfg.volume;
            if (!s.isNoise) {
                (s.node as OscillatorNode).type = cfg.type as OscillatorType;
                (s.node as OscillatorNode).detune.setValueAtTime(cfg.detune, now);
            }
        }
    }

    disconnect(): void {
        for (const s of this.sources) {
            s.node.disconnect();
            s.gainNode.disconnect();
        }
        this.envGain.disconnect();
    }
}

export class AudioEngine {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private noiseBuffer: AudioBuffer | null = null;

    ensureContext(): void {
        if (!this.ctx) {
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.4;
            this.masterGain.connect(this.ctx.destination);
            const sr = this.ctx.sampleRate;
            this.noiseBuffer = this.ctx.createBuffer(1, sr * 2, sr);
            const data = this.noiseBuffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) {
                data[i] = Math.random() * 2 - 1;
            }
        }
        if (this.ctx.state === "suspended") {
            void this.ctx.resume();
        }
    }

    createVoice(freq: number, params: SynthParams, startTime: number): Voice {
        if (!this.ctx || !this.masterGain || !this.noiseBuffer) {
            throw new Error("AudioEngine not initialized");
        }
        return new Voice(this.ctx, freq, params, startTime, this.noiseBuffer, this.masterGain);
    }

    get currentTime(): number {
        return this.ctx?.currentTime ?? 0;
    }
}
