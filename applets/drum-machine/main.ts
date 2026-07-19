import type { AppletInit } from "../common.js";
import { AudioEngine } from "./audio-engine.js";
import { DrumStore } from "./state.js";
import { Sequencer } from "./sequencer.js";
import { buildControls } from "./controls-ui.js";

const CSS = [
    "* { box-sizing: border-box; margin: 0; padding: 0; }",
    "body { display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: system-ui, sans-serif; touch-action: manipulation; background: #090e13; }",
    "#app { width: 100%; max-width: 800px; padding: 0.75rem; }",

    // Top bar
    ".top-bar { display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem; background: #0c1320; border-radius: 8px 8px 0 0; flex-wrap: wrap; }",
    ".transport-btn { width: 2rem; height: 2rem; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; }",
    ".play-btn { background: #27ae60; color: #fff; }",
    ".play-btn:hover { background: #2ecc71; }",
    ".stop-btn { background: #c0392b; color: #fff; }",
    ".stop-btn:hover { background: #e74c3c; }",
    ".clear-btn { background: #555; color: #aaa; font-size: 0.85rem; }",
    ".clear-btn:hover { background: #777; color: #fff; }",
    ".bpm-label, .mv-label { color: #889bb0; font-size: 0.75rem; text-transform: uppercase; }",
    ".bpm-input { width: 3.5rem; padding: 0.2rem; background: #0a1119; border: 1px solid #1a2a3a; color: #f9f9f9; border-radius: 4px; font-size: 0.85rem; text-align: center; }",
    ".mv-slider { width: 5rem; }",

    // Step dots
    ".step-dots { display: flex; gap: 2px; align-items: center; margin-left: auto; }",
    ".step-dot { width: 8px; height: 8px; border-radius: 50%; background: #1a2a3a; transition: background 0.06s; }",
    ".step-dot.active { background: #ffda79; box-shadow: 0 0 6px #ffda79; }",
    ".step-dot.step-4 { width: 10px; height: 10px; }",

    // Grid
    ".step-grid { background: #0c1320; border-radius: 0 0 8px 8px; padding: 0.25rem; overflow-x: auto; }",
    ".grid-row { display: flex; gap: 1px; margin-bottom: 1px; align-items: center; }",
    ".grid-header { position: sticky; top: 0; z-index: 2; background: #0c1320; }",
    ".grid-cell { display: flex; align-items: center; justify-content: center; }",
    ".header-cell { width: 28px; height: 20px; font-size: 0.6rem; color: #556; flex-shrink: 0; }",
    ".header-cell.beat { color: #889bb0; font-weight: bold; }",
    ".label-cell { width: 120px; min-width: 120px; gap: 0.2rem; justify-content: flex-start; padding: 0 0.2rem; flex-shrink: 0; }",
    ".grid-header > div:first-child { width: 120px; min-width: 120px; flex-shrink: 0; }",
    ".color-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }",
    ".label-text { color: #f9f9f9; font-size: 0.65rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }",
    ".pad-btn { width: 1.2rem; height: 1.2rem; border: none; border-radius: 3px; background: #1a2a3a; color: #889bb0; cursor: pointer; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.06s, transform 0.05s; }",
    ".pad-btn:hover { background: #2a3a4a; }",
    ".pad-btn.pad-active { background: #ffda79; color: #090e13; transform: scale(0.9); }",
    ".step-cell { width: 28px; height: 28px; background: #111d2e; border-radius: 3px; cursor: pointer; transition: background 0.06s; flex-shrink: 0; }",
    ".step-cell:hover { background: #1a2a3a; }",
    ".step-cell.on { background: #ffda79; box-shadow: 0 0 4px rgba(255,218,121,0.5); }",
    ".step-cell.beat { border-left: 1px solid #1a2a3a; }",
    ".vol-cell { width: 3rem; margin-left: auto; flex-shrink: 0; }",
    ".track-vol { width: 2.5rem; height: 3px; appearance: none; -webkit-appearance: none; background: #1a2a3a; border-radius: 2px; outline: none; }",
    ".track-vol::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 10px; height: 10px; border-radius: 50%; background: #889bb0; cursor: pointer; }",

    // Responsive
    "@media (max-width: 600px) {",
    ".label-cell { width: 80px; min-width: 80px; }",
    ".grid-header > div:first-child { width: 80px; min-width: 80px; }",
    ".label-text { font-size: 0.55rem; }",
    ".step-cell { width: 20px; height: 24px; }",
    ".header-cell { width: 20px; font-size: 0.5rem; }",
    ".vol-cell { width: 2rem; }",
    ".track-vol { width: 1.5rem; }",
    "}",

    // Status overlay
    "#status { text-align: center; color: #ffda79; font-size: 0.9rem; padding: 0.5rem; background: #090e13; border-radius: 6px; }",
].join("\n");

const init: AppletInit = (_canvas: HTMLCanvasElement) => {
    const container = _canvas.parentElement!;
    _canvas.remove();

    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    const status = document.createElement("div");
    status.id = "status";
    status.textContent = "\u{1F3B5} Haz clic en PLAY o en un pad para activar el audio";
    container.appendChild(status);

    const audio = new AudioEngine();
    const store = new DrumStore();
    const sequencer = new Sequencer(store, audio);

    buildControls(container, store, sequencer, audio);

    // Hide status on first interaction
    let activated = false;
    const activate = () => {
        if (activated) return;
        activated = true;
        audio.ensureContext();
        status.style.display = "none";
    };
    container.addEventListener("pointerdown", activate, { once: true });
};

export default init;
