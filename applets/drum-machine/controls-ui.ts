import { DRUM_SOUNDS, DRUM_LABELS, DRUM_COLORS } from "./types.js";
import type { DrumStore } from "./state.js";
import type { AudioEngine } from "./audio-engine.js";
import type { Sequencer } from "./sequencer.js";

export function buildControls(
    container: HTMLElement,
    store: DrumStore,
    sequencer: Sequencer,
    audio: AudioEngine,
): HTMLDivElement {
    const wrapper = document.createElement("div");
    wrapper.id = "drum-controls";

    wrapper.appendChild(buildTopBar(store, sequencer, audio));
    wrapper.appendChild(buildStepGrid(store, audio));
    container.appendChild(wrapper);
    return wrapper;
}

// --- Top bar: play/stop, BPM, master volume ---

function buildTopBar(
    store: DrumStore,
    sequencer: Sequencer,
    audio: AudioEngine,
): HTMLDivElement {
    const bar = document.createElement("div");
    bar.className = "top-bar";

    // Play button
    const playBtn = document.createElement("button");
    playBtn.className = "transport-btn play-btn";
    playBtn.textContent = "\u25B6";
    playBtn.addEventListener("click", () => {
        audio.ensureContext();
        sequencer.start();
    });

    // Stop button
    const stopBtn = document.createElement("button");
    stopBtn.className = "transport-btn stop-btn";
    stopBtn.textContent = "\u25A0";
    stopBtn.addEventListener("click", () => sequencer.stop());

    // BPM
    const bpmLabel = document.createElement("label");
    bpmLabel.textContent = "BPM";
    bpmLabel.className = "bpm-label";
    const bpmInput = document.createElement("input");
    bpmInput.type = "number";
    bpmInput.className = "bpm-input";
    bpmInput.value = String(store.state.bpm);
    bpmInput.min = "40";
    bpmInput.max = "220";
    bpmInput.step = "1";
    bpmInput.addEventListener("input", () => {
        const v = parseFloat(bpmInput.value) || 120;
        store.setBPM(v);
        sequencer.setBPM(v);
    });

    // Master volume
    const mvLabel = document.createElement("label");
    mvLabel.textContent = "Vol";
    mvLabel.className = "mv-label";
    const mvSlider = document.createElement("input");
    mvSlider.type = "range";
    mvSlider.className = "mv-slider";
    mvSlider.min = "0";
    mvSlider.max = "100";
    mvSlider.value = String(Math.round(store.state.masterVolume * 100));
    mvSlider.addEventListener("input", () => {
        const v = parseInt(mvSlider.value) / 100;
        store.setMasterVolume(v);
        audio.setMasterVolume(v);
    });

    // Clear button
    const clearBtn = document.createElement("button");
    clearBtn.className = "transport-btn clear-btn";
    clearBtn.textContent = "\u2717";
    clearBtn.title = "Clear all steps";
    clearBtn.addEventListener("click", () => store.clearAllSteps());

    // Step indicator dots
    const stepDots = document.createElement("div");
    stepDots.className = "step-dots";
    const dots: HTMLSpanElement[] = [];
    for (let i = 0; i < 16; i++) {
        const d = document.createElement("span");
        d.className = "step-dot";
        stepDots.appendChild(d);
        dots.push(d);
    }

    store.onChange((st) => {
        bpmInput.value = String(st.bpm);
        mvSlider.value = String(Math.round(st.masterVolume * 100));
        for (let i = 0; i < 16; i++) {
            dots[i].classList.toggle("active", i === st.currentStep);
            dots[i].classList.toggle("step-4", i % 4 === 0);
        }
    });

    bar.append(playBtn, stopBtn, clearBtn, bpmLabel, bpmInput, mvLabel, mvSlider, stepDots);
    return bar;
}

// --- Step grid ---

function buildStepGrid(store: DrumStore, audio: AudioEngine): HTMLDivElement {
    const grid = document.createElement("div");
    grid.className = "step-grid";

    // Column headers (beat markers)
    const headerRow = document.createElement("div");
    headerRow.className = "grid-row grid-header";
    headerRow.appendChild(document.createElement("div")); // empty top-left
    for (let i = 0; i < 16; i++) {
        const h = document.createElement("div");
        h.className = "grid-cell header-cell";
        h.textContent = String(i + 1);
        if (i % 4 === 0) h.classList.add("beat");
        headerRow.appendChild(h);
    }
    grid.appendChild(headerRow);

    // Track cells: array of [sound, step] → HTMLDivElement for quick updates
    const cellMap = new Map<string, HTMLDivElement>();

    for (const sound of DRUM_SOUNDS) {
        const row = document.createElement("div");
        row.className = "grid-row";

        // Label + trigger pad
        const labelCell = document.createElement("div");
        labelCell.className = "grid-cell label-cell";
        const colorDot = document.createElement("span");
        colorDot.className = "color-dot";
        colorDot.style.background = DRUM_COLORS[sound];
        labelCell.appendChild(colorDot);

        const labelText = document.createElement("span");
        labelText.className = "label-text";
        labelText.textContent = DRUM_LABELS[sound];
        labelCell.appendChild(labelText);

        const padBtn = document.createElement("button");
        padBtn.className = "pad-btn";
        padBtn.textContent = "\u25CF";
        padBtn.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            audio.ensureContext();
            audio.triggerSound(sound, 0.8);
            padBtn.classList.add("pad-active");
        });
        padBtn.addEventListener("pointerup", () => padBtn.classList.remove("pad-active"));
        padBtn.addEventListener("pointerleave", () => padBtn.classList.remove("pad-active"));
        labelCell.appendChild(padBtn);
        row.appendChild(labelCell);

        // 16 step cells
        for (let step = 0; step < 16; step++) {
            const cell = document.createElement("div");
            cell.className = "grid-cell step-cell";
            if (step % 4 === 0) cell.classList.add("beat");
            cell.dataset.sound = sound;
            cell.dataset.step = String(step);

            // Initial state
            if (store.state.steps[sound][step]) cell.classList.add("on");

            cell.addEventListener("pointerdown", (e) => {
                e.preventDefault();
                store.toggleStep(sound, step);
            });

            row.appendChild(cell);
            cellMap.set(`${sound}:${step}`, cell);
        }

        // Volume slider
        const volCell = document.createElement("div");
        volCell.className = "grid-cell vol-cell";
        const volSlider = document.createElement("input");
        volSlider.type = "range";
        volSlider.className = "track-vol";
        volSlider.min = "0";
        volSlider.max = "100";
        volSlider.value = String(Math.round(store.state.volumes[sound] * 100));
        volSlider.addEventListener("input", () => {
            store.setVolume(sound, parseInt(volSlider.value) / 100);
        });
        volCell.appendChild(volSlider);
        row.appendChild(volCell);

        grid.appendChild(row);
    }

    // React to store changes
    store.onChange((st) => {
        for (const sound of DRUM_SOUNDS) {
            for (let step = 0; step < 16; step++) {
                const cell = cellMap.get(`${sound}:${step}`);
                if (cell) cell.classList.toggle("on", st.steps[sound][step]);
            }
        }
    });

    return grid;
}
