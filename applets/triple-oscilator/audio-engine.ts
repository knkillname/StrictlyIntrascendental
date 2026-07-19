import type { SynthParams } from "./types.js";

export function midiToFrequency(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

interface SourceEntry {
    node: OscillatorNode | AudioBufferSourceNode;
    gainNode: GainNode;
    isNoise: boolean;
    index: number;
    ringGain?: GainNode;
}

export class Voice {
    private sources: SourceEntry[] = [];
    private envGain: GainNode;
    private ctx: AudioContext;
    private releaseSec: number;
    private ringMod = false;

    constructor(
        ctx: AudioContext,
        freq: number,
        params: SynthParams,
        startTime: number,
        noiseBuffer: AudioBuffer,
        masterGain: GainNode,
        velocity: number,
    ) {
        this.ctx = ctx;
        this.releaseSec = params.adsr.release;
        this.ringMod = params.osc[2].ringMod;
        this.envGain = ctx.createGain();
        this.envGain.gain.setValueAtTime(0, startTime);
        this.envGain.connect(masterGain);

        const spread = params.spread;

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
                const octaveFreq = freq * Math.pow(2, cfg.octave);
                osc.frequency.setValueAtTime(octaveFreq, startTime);
                // Spread: OSC1 goes left, OSC3 goes right, OSC2 stays centered
                const spreadOffset = i === 0 ? -spread : i === 2 ? spread : 0;
                osc.detune.setValueAtTime(cfg.detune + spreadOffset, startTime);
                osc.connect(gainNode);
                gainNode.connect(this.envGain);
                osc.start(startTime);
                this.sources.push({ node: osc, gainNode, isNoise: false, index: i });
            }
        }

        // Ring modulation: OSC2 modulates OSC3's amplitude
        if (this.ringMod && this.sources.length === 3) {
            const modSrc = this.sources[1];
            const carSrc = this.sources[2];
            modSrc.gainNode.disconnect();
            carSrc.gainNode.disconnect();
            const ringGain = ctx.createGain();
            ringGain.gain.value = 1;
            modSrc.gainNode.connect(ringGain.gain);
            carSrc.gainNode.connect(ringGain);
            ringGain.connect(this.envGain);
            modSrc.ringGain = ringGain;
            carSrc.ringGain = ringGain;
        }

        const a = params.adsr;
        const attackEnd = startTime + a.attack;
        const decayEnd = attackEnd + a.decay;
        const sustainEnd = decayEnd + a.sustainTime;
        const gain = this.envGain.gain;
        gain.cancelScheduledValues(startTime);
        gain.setValueAtTime(0, startTime);
        gain.linearRampToValueAtTime(velocity, attackEnd);
        gain.linearRampToValueAtTime(a.sustainLevel * velocity, decayEnd);
        gain.setValueAtTime(a.sustainLevel * velocity, sustainEnd);
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
        const spread = params.spread;
        for (const s of this.sources) {
            const cfg = params.osc[s.index];
            s.gainNode.gain.value = cfg.volume;
            if (!s.isNoise) {
                const osc = s.node as OscillatorNode;
                osc.type = cfg.type as OscillatorType;
                const spreadOffset = s.index === 0 ? -spread : s.index === 2 ? spread : 0;
                osc.detune.setValueAtTime(cfg.detune + spreadOffset, now);
            }
        }
    }

    disconnect(): void {
        for (const s of this.sources) {
            s.node.disconnect();
            s.gainNode.disconnect();
            if (s.ringGain) s.ringGain.disconnect();
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

    createVoice(freq: number, params: SynthParams, startTime: number, velocity = 1): Voice {
        if (!this.ctx || !this.masterGain || !this.noiseBuffer) {
            throw new Error("AudioEngine not initialized");
        }
        return new Voice(this.ctx, freq, params, startTime, this.noiseBuffer, this.masterGain, velocity);
    }

    get currentTime(): number {
        return this.ctx?.currentTime ?? 0;
    }
}
