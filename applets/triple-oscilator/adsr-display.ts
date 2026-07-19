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
    let holdSec = 0;
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

    function drawTemplate(adsr: ADSRConfig): void {
        const total = adsr.attack + adsr.decay + adsr.sustainTime + adsr.release;
        if (total <= 0) return;
        const pad = 10;
        const gw = w - pad * 2;
        const gh = h - pad * 2;
        const tX = (t: number) => pad + (t / total) * gw;
        const lY = (lvl: number) => pad + gh - lvl * gh;

        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = "#ffda79";
        ctx.lineWidth = 2;
        ctx.beginPath();
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

    // Draws the envelope for a note that was held holdSec seconds then released.
    // Sustain is truncated; release starts from the actual gain at holdSec.
    function drawCustomCurve(adsr: ADSRConfig): void {
        const pad = 10;
        const gw = w - pad * 2;
        const gh = h - pad * 2;
        const a = adsr.attack;
        const d = adsr.decay;
        const sl = adsr.sustainLevel;
        const st = adsr.sustainTime;
        const r = adsr.release;

        // How far into the pre-scheduled envelope did the hold reach?
        const actualSustain = Math.max(0, Math.min(holdSec - a - d, st));
        const total = a + d + actualSustain + r;
        if (total <= 0) return;

        const tX = (t: number) => pad + (t / total) * gw;
        const lY = (lvl: number) => pad + gh - lvl * gh;

        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(tX(a + d + actualSustain), lY(sl));
        ctx.lineTo(tX(a + d + st), lY(sl));
        ctx.lineTo(tX(a + d + st + r), lY(0));
        ctx.stroke();
        ctx.setLineDash([]);

        // Solid: actual envelope attack → decay → sustain at sustainLevel → release
        ctx.strokeStyle = "#ffda79";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pad, pad + gh);
        ctx.lineTo(tX(a), lY(1));
        ctx.lineTo(tX(a + d), lY(sl));
        const susEnd = a + d + actualSustain;
        ctx.lineTo(tX(susEnd), lY(sl));            // sustain holds at sustainLevel
        ctx.moveTo(tX(susEnd), lY(releaseGain));   // break: jump to actual release gain
        ctx.lineTo(tX(total), lY(0));               // release ramp
        ctx.stroke();

        ctx.strokeStyle = "#555";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad, pad);
        ctx.lineTo(pad, h - pad);
        ctx.lineTo(w - pad, h - pad);
        ctx.stroke();
    }

    function drawCursor(x: number, y: number): void {
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
        resize();
        if (w === 0 || h === 0) { requestAnimationFrame(tick); return; }

        const pad = 10;
        const gw = w - pad * 2;
        const gh = h - pad * 2;

        if (!released) {
            const total = adsr.attack + adsr.decay + adsr.sustainTime + adsr.release;
            if (total <= 0) { animating = false; return; }
            const elapsed = (performance.now() - startMs) / 1000;
            if (elapsed >= total) { animating = false; return; }
            drawTemplate(adsr);
            const gain = envelopeGainAt(elapsed, adsr);
            const x = pad + (elapsed / total) * gw;
            const y = pad + gh - Math.max(0, Math.min(1, gain)) * gh;
            drawCursor(x, y);
            requestAnimationFrame(tick);
        } else {
            const re = (performance.now() - releaseMs) / 1000;
            if (re >= adsr.release) {
                released = false;
                animating = false;
                return;
            }
            const a = adsr.attack;
            const d = adsr.decay;
            const actualSustain = Math.max(0, Math.min(holdSec - a - d, adsr.sustainTime));
            const customTotal = a + d + actualSustain + adsr.release;
            if (customTotal <= 0) { animating = false; return; }
            drawCustomCurve(adsr);
            const gain = releaseGain * (1 - re / (adsr.release || 0.001));
            const susEnd = a + d + actualSustain;
            const x = pad + ((susEnd + re) / customTotal) * gw;
            const y = pad + gh - Math.max(0, Math.min(1, gain)) * gh;
            drawCursor(x, y);
            requestAnimationFrame(tick);
        }
    }

    store.onChange((params) => {
        if (!released) {
            drawTemplate(params.adsr);
        } else {
            drawCustomCurve(params.adsr);
        }
        if (activeCount > 0 || released) {
            if (!animating) { animating = true; requestAnimationFrame(tick); }
        }
    });

    requestAnimationFrame(() => drawTemplate(store.params.adsr));

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
                holdSec = (now - startMs) / 1000;
                released = true;
                releaseMs = now;
                releaseGain = envelopeGainAt(holdSec, store.params.adsr);
                if (!animating) { animating = true; requestAnimationFrame(tick); }
            }
        },
    };
}
