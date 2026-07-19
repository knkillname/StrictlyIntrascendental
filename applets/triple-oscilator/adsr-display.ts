import type { ADSRConfig } from "./types.js";
import type { SynthStore } from "./state.js";

export function setupADSRDisplay(
    canvas: HTMLCanvasElement,
    store: SynthStore,
): void {
    const ctx = canvas.getContext("2d")!;
    let w = 0;
    let h = 0;

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

    function draw(adsr: ADSRConfig): void {
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

    store.onChange((params) => draw(params.adsr));

    // Defer first draw until layout completes (canvas dimensions are 0 otherwise).
    requestAnimationFrame(() => draw(store.params.adsr));
}
