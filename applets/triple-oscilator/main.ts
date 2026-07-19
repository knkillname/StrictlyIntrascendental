import type { AppletInit } from "../common.js";
import { AudioEngine, Voice, midiToFrequency } from "./audio-engine.js";
import { SynthStore } from "./state.js";
import { Keyboard } from "./keyboard-dom.js";
import { setupQwerty } from "./qwerty-input.js";
import { buildControls } from "./controls-ui.js";
import { setupADSRDisplay } from "./adsr-display.js";
import type { ADSRDisplayAPI } from "./adsr-display.js";

const CSS = [
    "* { box-sizing: border-box; margin: 0; padding: 0; }",
    "body { display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: sans-serif; touch-action: manipulation; }",
    "#app { width: 100%; max-width: 1000px; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }",
    "#controls { background: #0c1320; border-radius: 12px; padding: 1rem; display: flex; flex-wrap: wrap; gap: 1.5rem; color: #f9f9f9; font-size: 0.85rem; }",
    ".osc-section,.adsr-section { background: #111d2e; border-radius: 8px; padding: 0.8rem; flex: 1 1 200px; }",
    ".osc-section h3,.adsr-section h3 { margin-bottom: 0.5rem; font-weight: normal; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; color: #889bb0; }",
    ".row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem; }",
    "label { margin-right: 0.5rem; flex: 1; }",
    "select,input[type=number] { padding: 0.2rem; font-size: 0.8rem; background: #0a1119; border: 1px solid #1a2a3a; color: #f9f9f9; border-radius: 4px; }",
    "input[type=range] { width: 100px; vertical-align: middle; }",
    ".adsr-sliders { display: flex; gap: 1rem; align-items: stretch; }",
    ".adsr-vertical-sliders { flex: 1; display: flex; gap: 0.8rem; justify-content: space-between; }",
    ".adsr-slider-item { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; flex: 1; }",
    ".adsr-slider-item label { font-size: 0.7rem; margin: 0; }",
    ".adsr-slider-item input[type=range] { -webkit-appearance: slider-vertical; appearance: slider-vertical; width: 20px; height: 100px; writing-mode: vertical-lr; direction: rtl; }",
    ".adsr-slider-item span { font-size: 0.7rem; white-space: nowrap; }",
    ".adsr-canvas { flex: 1; display: flex; align-items: center; justify-content: center; }",
    ".adsr-canvas canvas { background: #0a1119; border-radius: 4px; width: 100%; height: 100px; }",
    "#keyboard { position: relative; width: 100%; height: 200px; user-select: none; -webkit-user-select: none; touch-action: none; display: flex; flex-wrap: nowrap; }",
    ".white { flex: 1; background: linear-gradient(to bottom,#f9f9f9,#d0d0d0); border: 1px solid #667; border-radius: 0 0 4px 4px; cursor: pointer; transition: background .07s,transform .05s; position: relative; z-index: 1; }",
    ".white:hover { background: linear-gradient(to bottom,#fff,#d0d0d0); }",
    ".white.active { background: #ffda79; transform: scale(0.97); }",
    ".black { position: absolute; z-index: 2; top: 0; height: 60%; background: linear-gradient(to bottom,#111d2e,#090e13); border: 1px solid #000; border-radius: 0 0 3px 3px; cursor: pointer; transition: background .07s,transform .05s; }",
    ".black:hover { background: linear-gradient(to bottom,#1a2a3a,#0a1119); }",
    ".black.active { background: #b39242; transform: scale(0.95); }",
    "#status { text-align: center; color: #ffda79; font-size: 0.9rem; margin-bottom: -0.5rem; background: #090e13; border-radius: 6px; padding: 0.4rem; }",
    ".adsr-section { flex: 2 1 400px; }",
].join("\n");

const init: AppletInit = (canvas: HTMLCanvasElement) => {
    const container = canvas.parentElement!;
    canvas.remove();

    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    const status = document.createElement("div");
    status.id = "status";
    status.textContent = "🖱️ Haz clic en el teclado para activar el sonido y usar QWERTY";
    container.appendChild(status);

    const audio = new AudioEngine();
    const store = new SynthStore();

    buildControls(container, store);

    const adsrCanvasContainer = document.getElementById("adsr-canvas-container")!;
    adsrCanvasContainer.appendChild(canvas);
    const adsrDisplay: ADSRDisplayAPI = setupADSRDisplay(canvas, store);

    const mouseVoices = new Map<number, Voice>();
    const keyboardVoices = new Map<string, Voice>();

    function startVoice(midi: number, velocity = 1): Voice {
        audio.ensureContext();
        const freq = midiToFrequency(midi);
        return audio.createVoice(freq, store.params, audio.currentTime, velocity);
    }

    function stopVoice(voice: Voice): void {
        voice.release();
    }

    store.onChange((params) => {
        for (const v of mouseVoices.values()) v.updateParams(params);
        for (const v of keyboardVoices.values()) v.updateParams(params);
    });

    const keyboard = new Keyboard(container, {
        onNoteOn(pointerId, _midi, _element, velocity) {
            const voice = startVoice(_midi, velocity);
            mouseVoices.set(pointerId, voice);
            adsrDisplay.noteOn();
        },
        onNoteOff(pointerId, _midi, _element) {
            const voice = mouseVoices.get(pointerId);
            if (voice) {
                stopVoice(voice);
                mouseVoices.delete(pointerId);
            }
            adsrDisplay.noteOff();
        },
    });

    let qwertyActivated = false;
    container.addEventListener("pointerdown", () => {
        if (!qwertyActivated) {
            qwertyActivated = true;
            status.style.display = "none";
        }
    }, { once: true });

    setupQwerty(keyboard.midiToElement, {
        onNoteOn(code, midi) {
            audio.ensureContext();
            if (!qwertyActivated) {
                qwertyActivated = true;
                status.style.display = "none";
            }
            const voice = startVoice(midi, 0.8);
            keyboardVoices.set(code, voice);
            adsrDisplay.noteOn();
        },
        onNoteOff(code, _midi) {
            const voice = keyboardVoices.get(code);
            if (voice) {
                stopVoice(voice);
                keyboardVoices.delete(code);
            }
            adsrDisplay.noteOff();
        },
    });
};

export default init;
