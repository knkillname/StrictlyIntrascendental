import type { DrumSound } from "./types.js";

export interface DrumVoice {
    stop(time: number): void;
    disconnect(): void;
}

// --- helpers ---

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, sr * 2, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
}

// --- envelope helpers ---

function rampDecay(gain: AudioParam, t0: number, dur: number, level: number): void {
    gain.setValueAtTime(0, t0);
    gain.linearRampToValueAtTime(level, t0 + 0.003);
    gain.exponentialRampToValueAtTime(1e-5, t0 + dur);
}

function pitchSweep(
    osc: OscillatorNode,
    t0: number, fromHz: number, toHz: number, dur: number,
): void {
    osc.frequency.setValueAtTime(fromHz, t0);
    osc.frequency.exponentialRampToValueAtTime(toHz, t0 + dur);
}

// --- voice builders ---

interface VoiceParts {
    nodes: AudioNode[];
    stopFns: ((t: number) => void)[];
    maxDur: number;
}

function buildBD(ctx: AudioContext, out: GainNode, vel: number, master: number): VoiceParts {
    const g = ctx.createGain();
    g.connect(out);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.connect(g);
    const t = ctx.currentTime;
    const level = vel * master * 0.6;
    pitchSweep(osc, t, 150, 40, 0.2);
    rampDecay(g.gain, t, 0.35, level);
    osc.start(t);
    osc.stop(t + 0.4);
    return { nodes: [osc, g], stopFns: [], maxDur: 0.4 };
}

function buildSD(ctx: AudioContext, out: GainNode, vel: number, master: number, noiseBuf: AudioBuffer): VoiceParts {
    const mix = ctx.createGain();
    mix.connect(out);
    const t = ctx.currentTime;
    const level = vel * master * 0.6;

    // Tone
    const tone = ctx.createOscillator();
    tone.type = "sine";
    tone.frequency.value = 180;
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0, t);
    tg.gain.linearRampToValueAtTime(level * 0.5, t + 0.003);
    tg.gain.exponentialRampToValueAtTime(1e-5, t + 0.15);
    tone.connect(tg);
    tg.connect(mix);
    tone.start(t);
    tone.stop(t + 0.2);

    // Noise through bandpass
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1000;
    bp.Q.value = 1;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(level * 0.7, t + 0.003);
    ng.gain.exponentialRampToValueAtTime(1e-5, t + 0.15);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(mix);
    noise.start(t);
    noise.stop(t + 0.2);

    return { nodes: [tone, tg, noise, bp, ng, mix], stopFns: [], maxDur: 0.2 };
}

function buildTom(ctx: AudioContext, out: GainNode, vel: number, master: number, freq: number, freqEnd: number): VoiceParts {
    const g = ctx.createGain();
    g.connect(out);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.connect(g);
    const t = ctx.currentTime;
    const level = vel * master * 0.6;
    pitchSweep(osc, t, freq, freqEnd, 0.15);
    rampDecay(g.gain, t, 0.25, level);
    osc.start(t);
    osc.stop(t + 0.3);
    return { nodes: [osc, g], stopFns: [], maxDur: 0.3 };
}

function buildCH(ctx: AudioContext, out: GainNode, vel: number, master: number, noiseBuf: AudioBuffer): VoiceParts {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.connect(out);
    const t = ctx.currentTime;
    const level = vel * master * 0.3;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.002);
    g.gain.exponentialRampToValueAtTime(1e-5, t + 0.05);
    noise.connect(hp);
    hp.connect(g);
    noise.start(t);
    noise.stop(t + 0.08);
    return { nodes: [noise, hp, g], stopFns: [], maxDur: 0.08 };
}

function buildOH(ctx: AudioContext, out: GainNode, vel: number, master: number, noiseBuf: AudioBuffer): VoiceParts {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.connect(out);
    const t = ctx.currentTime;
    const level = vel * master * 0.25;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.003);
    g.gain.setValueAtTime(level, t + 0.02);
    g.gain.exponentialRampToValueAtTime(1e-5, t + 0.4);
    noise.connect(hp);
    hp.connect(g);
    noise.start(t);
    noise.stop(t + 0.45);
    return {
        nodes: [noise, hp, g],
        stopFns: [(t2: number) => {
            g.gain.cancelScheduledValues(t2);
            g.gain.setValueAtTime(g.gain.value, t2);
            g.gain.exponentialRampToValueAtTime(1e-5, t2 + 0.02);
        }],
        maxDur: 0.45,
    };
}

function buildCP(ctx: AudioContext, out: GainNode, vel: number, master: number, noiseBuf: AudioBuffer): VoiceParts {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2000;
    bp.Q.value = 1.5;
    const g = ctx.createGain();
    g.connect(out);
    const t = ctx.currentTime;
    const level = vel * master * 0.4;
    for (let i = 0; i < 3; i++) {
        const bt = t + i * 0.015;
        g.gain.setValueAtTime(0, bt);
        g.gain.linearRampToValueAtTime(level, bt + 0.003);
        g.gain.exponentialRampToValueAtTime(1e-5, bt + 0.03);
    }
    g.gain.setValueAtTime(0, t + 0.045);
    g.gain.linearRampToValueAtTime(level * 0.3, t + 0.048);
    g.gain.exponentialRampToValueAtTime(1e-5, t + 0.15);
    noise.connect(bp);
    bp.connect(g);
    noise.start(t);
    noise.stop(t + 0.18);
    return { nodes: [noise, bp, g], stopFns: [], maxDur: 0.18 };
}

function buildRS(ctx: AudioContext, out: GainNode, vel: number, master: number): VoiceParts {
    const g = ctx.createGain();
    g.connect(out);
    const t = ctx.currentTime;
    const level = vel * master * 0.5;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.001);
    g.gain.exponentialRampToValueAtTime(1e-5, t + 0.02);

    const o1 = ctx.createOscillator();
    o1.type = "sine";
    o1.frequency.value = 1000;
    o1.connect(g);
    o1.start(t);
    o1.stop(t + 0.025);

    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = 1800;
    o2.connect(g);
    o2.start(t);
    o2.stop(t + 0.025);

    return { nodes: [o1, o2, g], stopFns: [], maxDur: 0.025 };
}

function buildCB(ctx: AudioContext, out: GainNode, vel: number, master: number): VoiceParts {
    const g = ctx.createGain();
    g.connect(out);
    const t = ctx.currentTime;
    const level = vel * master * 0.4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.002);
    g.gain.exponentialRampToValueAtTime(1e-5, t + 0.12);

    const o1 = ctx.createOscillator();
    o1.type = "square";
    o1.frequency.value = 540;
    o1.connect(g);
    o1.start(t);
    o1.stop(t + 0.14);

    const o2 = ctx.createOscillator();
    o2.type = "square";
    o2.frequency.value = 800;
    o2.connect(g);
    o2.start(t);
    o2.stop(t + 0.14);

    return { nodes: [o1, o2, g], stopFns: [], maxDur: 0.14 };
}

function buildCY(ctx: AudioContext, out: GainNode, vel: number, master: number, noiseBuf: AudioBuffer): VoiceParts {
    const mix = ctx.createGain();
    mix.connect(out);
    const t = ctx.currentTime;
    const level = vel * master * 0.2;

    // Noise through bandpass
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 7000;
    bp.Q.value = 0.7;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(level, t);
    ng.gain.linearRampToValueAtTime(level * 0.3, t + 1);
    ng.gain.exponentialRampToValueAtTime(1e-5, t + 1.5);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(mix);
    noise.start(t);
    noise.stop(t + 1.6);

    // High metallic oscillator
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 3500;
    const og = ctx.createGain();
    og.gain.setValueAtTime(level * 0.4, t);
    og.gain.exponentialRampToValueAtTime(1e-5, t + 1.2);
    osc.connect(og);
    og.connect(mix);
    osc.start(t);
    osc.stop(t + 1.3);

    return { nodes: [noise, bp, ng, osc, og, mix], stopFns: [], maxDur: 1.5 };
}

type BuilderFn = (ctx: AudioContext, out: GainNode, vel: number, master: number, noiseBuf: AudioBuffer) => VoiceParts;

const BUILDERS: Record<DrumSound, BuilderFn> = {
    bd: buildBD,
    sd: buildSD,
    lt: (ctx, out, vel, master, _nb) => buildTom(ctx, out, vel, master, 120, 60),
    mt: (ctx, out, vel, master, _nb) => buildTom(ctx, out, vel, master, 200, 100),
    ht: (ctx, out, vel, master, _nb) => buildTom(ctx, out, vel, master, 300, 150),
    ch: buildCH,
    oh: buildOH,
    cp: buildCP,
    rs: buildRS,
    cb: buildCB,
    cy: buildCY,
};

// --- AudioEngine ---

export class AudioEngine {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private noiseBuf: AudioBuffer | null = null;
    /** Currently playing open hi‑hat voice, for choking */
    private activeOH: DrumVoice | null = null;

    ensureContext(): void {
        if (!this.ctx) {
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.ctx.destination);
            this.noiseBuf = createNoiseBuffer(this.ctx);
        }
        if (this.ctx.state === "suspended") void this.ctx.resume();
    }

    triggerSound(sound: DrumSound, velocity = 0.8): void {
        if (!this.ctx || !this.masterGain) return;
        const voice = this.createVoice(sound, velocity);
        // Choke: closed hi‑hat stops open hi‑hat
        if (sound === "ch" && this.activeOH) {
            this.activeOH.stop(this.ctx.currentTime + 0.005);
            this.activeOH = null;
        }
        if (sound === "oh") this.activeOH = voice;
    }

    setMasterVolume(v: number): void {
        if (this.masterGain) this.masterGain.gain.value = v;
    }

    private createVoice(sound: DrumSound, velocity: number): DrumVoice {
        const ctx = this.ctx!;
        const out = ctx.createGain();
        out.connect(this.masterGain!);
        const master = this.masterGain!.gain.value;
        const noiseBuf = this.noiseBuf!;
        const parts = BUILDERS[sound](ctx, out, velocity, master, noiseBuf);

        const nodes = [out, ...parts.nodes];
        const disconnectTime = parts.maxDur + 0.05;
        const timer = setTimeout(() => {
            for (const n of nodes) n.disconnect();
        }, disconnectTime * 1000);

        return {
            stop(time: number) {
                for (const fn of parts.stopFns) fn(time);
                clearTimeout(timer);
                setTimeout(() => { for (const n of nodes) n.disconnect(); }, 100);
            },
            disconnect() {
                clearTimeout(timer);
                for (const n of nodes) n.disconnect();
            },
        };
    }
}
