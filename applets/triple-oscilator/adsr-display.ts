import type { ADSRConfig } from "./types.js";
import { envelopeGainAt } from "./types.js";
import type { SynthStore } from "./state.js";

export interface ADSRDisplayAPI {
    noteOn(): number;
    noteOff(id: number): void;
}

export function setupADSRDisplay(
    canvas: HTMLCanvasElement,
    store: SynthStore,
): ADSRDisplayAPI {
    const ctx = canvas.getContext("2d")!;
    let w = 0;
    let h = 0;

    interface Note {
        startMs: number;
        released: boolean;
        releaseMs: number;
    }

    const notes = new Map<number, Note>();
    let nextId = 1;
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

    function drawCurve(adsr: ADSRConfig): void {
        const pad = 10;
        const gw = w - pad * 2;
        const gh = h - pad * 2;
        // Use a floor so the envelope always spans at least 1 ms visually.
        const total = Math.max(
            adsr.attack + adsr.decay + adsr.sustainTime + adsr.release,
            0.001,
        );

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

    function cursorFor(adsr: ADSRConfig, note: Note, now: number): { x: number; y: number } | null {
        const pad = 10;
        const gw = w - pad * 2;
        const gh = h - pad * 2;
        const total = Math.max(
            adsr.attack + adsr.decay + adsr.sustainTime + adsr.release,
            0.001,
        );

        if (!note.released) {
            const elapsed = (now - note.startMs) / 1000;
            if (elapsed >= total) return null;
            const gain = envelopeGainAt(elapsed, adsr);
            const x = pad + (elapsed / total) * gw;
            const y = pad + gh - Math.max(0, Math.min(1, gain)) * gh;
            return { x, y };
        }

        const susStart = adsr.attack + adsr.decay + adsr.sustainTime;
        const re = (now - note.releaseMs) / 1000;
        if (re >= adsr.release) return null;
        const x = pad + ((susStart + re) / total) * gw;
        const gain = adsr.sustainLevel * (1 - re / (adsr.release || 0.001));
        const y = pad + gh - Math.max(0, Math.min(1, gain)) * gh;
        return { x, y };
    }

    function drawCursor(x: number, y: number): void {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = "#f9f9f9";
        ctx.shadowColor = "#f9f9f9";
        ctx.shadowBlur = 3;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    function tick(): void {
        resize();
        if (w === 0 || h === 0) { requestAnimationFrame(tick); return; }

        const adsr = store.params.adsr;
        drawCurve(adsr);

        const now = performance.now();
        let anyAlive = false;

        for (const [id, note] of notes) {
            const pos = cursorFor(adsr, note, now);
            if (!pos) {
                notes.delete(id);
                continue;
            }
            anyAlive = true;
            drawCursor(pos.x, pos.y);
        }

        if (anyAlive) {
            requestAnimationFrame(tick);
        } else {
            animating = false;
        }
    }

    store.onChange((params) => {
        if (notes.size > 0) {
            if (!animating) { animating = true; requestAnimationFrame(tick); }
        } else {
            drawCurve(params.adsr);
        }
    });

    requestAnimationFrame(() => drawCurve(store.params.adsr));

    return {
        noteOn(): number {
            const id = nextId++;
            notes.set(id, { startMs: performance.now(), released: false, releaseMs: 0 });
            if (!animating) { animating = true; requestAnimationFrame(tick); }
            return id;
        },
        noteOff(id: number): void {
            const note = notes.get(id);
            if (!note || note.released) return;
            note.released = true;
            note.releaseMs = performance.now();
        },
    };
}
