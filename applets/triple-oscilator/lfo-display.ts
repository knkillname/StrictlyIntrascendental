import type { LFOConfig } from "./types.js";
import type { SynthStore } from "./state.js";

function lfoSample(waveform: string, t: number): number {
    switch (waveform) {
        case "sine": return Math.sin(t * 2 * Math.PI);
        case "triangle": return 1 - 4 * Math.abs(t - 0.5);
        case "square": return t < 0.5 ? 1 : -1;
        case "sawtooth": return 1 - 2 * t;
    }
    return 0;
}

export function setupLFODisplay(
    canvas: HTMLCanvasElement,
    store: SynthStore,
): void {
    const ctx = canvas.getContext("2d")!;
    let animating = false;

    function draw(cfg: LFOConfig): void {
        const w = canvas.width;
        const h = canvas.height;
        const phase = (performance.now() / 1000 * cfg.rate) % 1;

        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = "#ffda79";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const N = 40;
        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const val = lfoSample(cfg.waveform, (t + phase) % 1);
            const x = 2 + t * (w - 4);
            const y = h / 2 - val * (h / 2 - 3);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    function tick(): void {
        if (store.params.lfo.target === "off") {
            animating = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }
        draw(store.params.lfo);
        requestAnimationFrame(tick);
    }

    store.onChange(() => {
        if (!animating && store.params.lfo.target !== "off") {
            animating = true;
            requestAnimationFrame(tick);
        }
    });

    if (store.params.lfo.target !== "off") {
        animating = true;
        requestAnimationFrame(tick);
    }
}
