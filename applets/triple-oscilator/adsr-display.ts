import type { ADSRConfig } from "./types.js";
import { envelopeGainAt } from "./types.js";
import type { SynthStore } from "./state.js";

export interface ADSRDisplayAPI {
    noteOn(): void;
    noteOff(): void;
}

export function setupADSRDisplay(
    canvas: HTMLCanvasElement,
    store: SynthStore,
): ADSRDisplayAPI {
    const ctx = canvas.getContext("2d")!;
    let w = 0;
    let h = 0;

    let activeCount = 0;
    let startMs = 0;
    let released = false;
    let releaseMs = 0;
    let releaseGain = 0;
    let animating = false;

    function resize(): void {
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        if (canvas.width !== cw || canvas.height !== ch) {
            canvas.width = cw;
            canvas.height = ch;
            w = cw;
            h = ch;
        }
    }

    function drawEnvelope(adsr: ADSRConfig): void {
        resize();
        if (w === 0 || h === 0) return;
        const pad = 10;
        const gw = w - pad * 2;
        const gh = h - pad * 2;
        const total = adsr.attack + adsr.decay + adsr.sustainTime + adsr.release;
        if (total <= 0) return;

        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = "#ffda79";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const tX = (t: number) => pad + (t / total) * gw;
        const lY = (lvl: number) => pad + gh - lvl * gh;
        ctx.moveTo(pad, pad + gh);
        ctx.lineTo(tX(adsr.attack), lY(1));
        ctx.lineTo(tX(adsr.attack + adsr.decay), lY(adsr.sustainLevel));
        ctx.lineTo(tX(adsr.attack + adsr.decay + adsr.sustainTime), lY(adsr.sustainLevel));
        ctx.lineTo(tX(total), lY(0));
        ctx.stroke();

        ctx.strokeStyle = "#555";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad, pad);
        ctx.lineTo(pad, h - pad);
        ctx.lineTo(w - pad, h - pad);
        ctx.stroke();
    }

    function drawCursor(elapsed: number, gain: number, adsr: ADSRConfig): void {
        const pad = 10;
        const gw = w - pad * 2;
        const gh = h - pad * 2;
        const total = adsr.attack + adsr.decay + adsr.sustainTime + adsr.release;
        const x = pad + (Math.min(elapsed, total) / (total || 1)) * gw;
        const y = pad + gh - Math.max(0, Math.min(1, gain)) * gh;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "#f9f9f9";
        ctx.shadowColor = "#f9f9f9";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    function tick(): void {
        if (activeCount === 0 && !released) { animating = false; return; }
        const adsr = store.params.adsr;
        const total = adsr.attack + adsr.decay + adsr.sustainTime + adsr.release;
        if (total <= 0) { animating = false; return; }

        const now = performance.now();
        drawEnvelope(adsr);

        if (!released) {
            const elapsed = (now - startMs) / 1000;
            if (elapsed >= total) {
                animating = false;
                return;
            }
            const gain = envelopeGainAt(elapsed, adsr);
            drawCursor(elapsed, gain, adsr);
            requestAnimationFrame(tick);
        } else {
            const re = (now - releaseMs) / 1000;
            if (re >= adsr.release) {
                released = false;
                animating = false;
                return;
            }
            const gain = releaseGain * (1 - re / (adsr.release || 0.001));
            const holdMs = releaseMs - startMs;
            const actualElapsed = (holdMs / 1000) + Math.min(re, adsr.release);
            drawCursor(actualElapsed, Math.max(0, gain), adsr);
            requestAnimationFrame(tick);
        }
    }

    store.onChange((params) => {
        drawEnvelope(params.adsr);
        if (activeCount > 0 || released) {
            if (!animating) { animating = true; requestAnimationFrame(tick); }
        }
    });

    requestAnimationFrame(() => drawEnvelope(store.params.adsr));

    return {
        noteOn(): void {
            activeCount++;
            if (activeCount === 1) {
                startMs = performance.now();
                released = false;
            }
            if (!animating) { animating = true; requestAnimationFrame(tick); }
        },
        noteOff(): void {
            if (activeCount <= 0) return;
            activeCount--;
            if (activeCount === 0) {
                const now = performance.now();
                const elapsed = (now - startMs) / 1000;
                released = true;
                releaseMs = now;
                releaseGain = envelopeGainAt(elapsed, store.params.adsr);
                if (!animating) { animating = true; requestAnimationFrame(tick); }
            }
        },
    };
}
