import type { SynthStore } from "./state.js";

export function buildControls(container: HTMLElement, store: SynthStore): HTMLDivElement {
    const wrapper = document.createElement("div");
    wrapper.id = "controls";

    for (let i = 0; i < 3; i++) {
        wrapper.appendChild(buildOscSection(i, store));
    }

    wrapper.appendChild(buildADSRSection(store));
    container.appendChild(wrapper);
    return wrapper;
}

function buildOscSection(index: number, store: SynthStore): HTMLDivElement {
    const section = document.createElement("div");
    section.className = "osc-section";

    const h3 = document.createElement("h3");
    h3.textContent = "Oscilador " + (index + 1);
    section.appendChild(h3);

    // Waveform select
    const waveRow = document.createElement("div");
    waveRow.className = "row";
    const waveLabel = document.createElement("label");
    waveLabel.textContent = "Forma de onda";
    waveRow.appendChild(waveLabel);
    const waveSelect = document.createElement("select");
    const waveforms = ["sine", "square", "sawtooth", "triangle", "noise"];
    const waveLabels: Record<string, string> = {
        sine: "Senoidal", square: "Cuadrada", sawtooth: "Sierra",
        triangle: "Triangular", noise: "Ruido blanco",
    };
    for (const w of waveforms) {
        const opt = document.createElement("option");
        opt.value = w;
        opt.textContent = waveLabels[w];
        if (w === store.params.osc[index].type) opt.selected = true;
        waveSelect.appendChild(opt);
    }
    waveSelect.addEventListener("change", () => {
        store.updateOsc(index as 0 | 1 | 2, { type: waveSelect.value as any });
    });
    waveRow.appendChild(waveSelect);
    section.appendChild(waveRow);

    // Detune
    const detuneRow = document.createElement("div");
    detuneRow.className = "row";
    const detuneLabel = document.createElement("label");
    detuneLabel.textContent = "Desafinación (cents)";
    detuneRow.appendChild(detuneLabel);
    const detuneInput = document.createElement("input");
    detuneInput.type = "number";
    detuneInput.value = String(store.params.osc[index].detune);
    detuneInput.step = "1";
    detuneInput.min = "-1200";
    detuneInput.max = "1200";
    detuneInput.style.width = "70px";
    detuneInput.addEventListener("input", () => {
        store.updateOsc(index as 0 | 1 | 2, { detune: parseFloat(detuneInput.value) || 0 });
    });
    detuneRow.appendChild(detuneInput);
    section.appendChild(detuneRow);

    // Octave select
    const octaveRow = document.createElement("div");
    octaveRow.className = "row";
    const octaveLabel = document.createElement("label");
    octaveLabel.textContent = "Octava";
    octaveRow.appendChild(octaveLabel);
    const octaveSelect = document.createElement("select");
    for (let o = -2; o <= 2; o++) {
        const opt = document.createElement("option");
        opt.value = String(o);
        opt.textContent = o > 0 ? "+" + o : String(o);
        if (o === store.params.osc[index].octave) opt.selected = true;
        octaveSelect.appendChild(opt);
    }
    octaveSelect.addEventListener("change", () => {
        store.updateOsc(index as 0 | 1 | 2, { octave: parseInt(octaveSelect.value) });
    });
    octaveRow.appendChild(octaveSelect);
    section.appendChild(octaveRow);

    // Ring modulation toggle (only OSC3)
    if (index === 2) {
        const ringRow = document.createElement("div");
        ringRow.className = "row";
        const ringLabel = document.createElement("label");
        ringLabel.textContent = "Mod. anillo";
        ringRow.appendChild(ringLabel);
        const ringCheck = document.createElement("input");
        ringCheck.type = "checkbox";
        ringCheck.checked = store.params.osc[index].ringMod;
        ringCheck.addEventListener("change", () => {
            store.updateOsc(2, { ringMod: ringCheck.checked });
        });
        ringRow.appendChild(ringCheck);
        section.appendChild(ringRow);
    }

    // Volume slider
    const volRow = document.createElement("div");
    volRow.className = "row";
    const volLabel = document.createElement("label");
    volLabel.textContent = "Volumen (%)";
    volRow.appendChild(volLabel);
    const volSlider = document.createElement("input");
    volSlider.type = "range";
    volSlider.min = "0";
    volSlider.max = "100";
    volSlider.value = String(Math.round(store.params.osc[index].volume * 100));
    volSlider.step = "1";
    const volSpan = document.createElement("span");
    volSpan.textContent = volSlider.value + "%";
    volSlider.addEventListener("input", () => {
        const val = parseFloat(volSlider.value) / 100;
        volSpan.textContent = volSlider.value + "%";
        store.updateOsc(index as 0 | 1 | 2, { volume: val });
    });
    volRow.appendChild(volSlider);
    volRow.appendChild(volSpan);
    section.appendChild(volRow);

    return section;
}

function buildADSRSection(store: SynthStore): HTMLDivElement {
    const section = document.createElement("div");
    section.className = "adsr-section";

    const h3 = document.createElement("h3");
    h3.textContent = "Envolvente ADSR";
    section.appendChild(h3);

    // Spread slider
    const spreadRow = document.createElement("div");
    spreadRow.className = "row";
    spreadRow.style.marginBottom = "0.6rem";
    const spreadLabel = document.createElement("label");
    spreadLabel.textContent = "Spread (¢)";
    spreadRow.appendChild(spreadLabel);
    const spreadSlider = document.createElement("input");
    spreadSlider.type = "range";
    spreadSlider.min = "0";
    spreadSlider.max = "50";
    spreadSlider.step = "1";
    spreadSlider.value = String(store.params.spread);
    const spreadSpan = document.createElement("span");
    spreadSpan.textContent = store.params.spread + "¢";
    spreadSlider.addEventListener("input", () => {
        const val = parseFloat(spreadSlider.value);
        spreadSpan.textContent = val + "¢";
        store.updateSpread(val);
    });
    spreadRow.appendChild(spreadSlider);
    spreadRow.appendChild(spreadSpan);
    section.appendChild(spreadRow);

    const sliders = document.createElement("div");
    sliders.className = "adsr-sliders";

    const verticalDiv = document.createElement("div");
    verticalDiv.className = "adsr-vertical-sliders";

    interface ADSRParam {
        id: string;
        label: string;
        min: number;
        max: number;
        step: number;
        get: () => number;
        format: (v: number) => string;
    }

    interface ADSRParamMap extends ADSRParam {
        key: "attack" | "decay" | "sustainLevel" | "sustainTime" | "release";
        scale?: number;
    }

    const adsrParams: ADSRParamMap[] = [
        {
            id: "attack", key: "attack", label: "Ataque", min: 0, max: 2, step: 0.01,
            get: () => store.params.adsr.attack, format: (v) => v.toFixed(2) + " s"
        },
        {
            id: "decay", key: "decay", label: "Decaim.", min: 0, max: 2, step: 0.01,
            get: () => store.params.adsr.decay, format: (v) => v.toFixed(2) + " s"
        },
        {
            id: "sustain-level", key: "sustainLevel", label: "Nivel S", min: 0, max: 100, step: 1, scale: 1 / 100,
            get: () => store.params.adsr.sustainLevel * 100, format: (v) => Math.round(v) + "%"
        },
        {
            id: "sustain-time", key: "sustainTime", label: "Tiempo S", min: 0, max: 3, step: 0.01,
            get: () => store.params.adsr.sustainTime, format: (v) => v.toFixed(2) + " s"
        },
        {
            id: "release", key: "release", label: "Release", min: 0, max: 3, step: 0.01,
            get: () => store.params.adsr.release, format: (v) => v.toFixed(2) + " s"
        },
    ];

    for (const p of adsrParams) {
        const item = document.createElement("div");
        item.className = "adsr-slider-item";

        const label = document.createElement("label");
        label.textContent = p.label;
        item.appendChild(label);

        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = String(p.min);
        slider.max = String(p.max);
        slider.step = String(p.step);
        slider.value = String(p.get());

        const span = document.createElement("span");
        span.textContent = p.format(p.get());

        slider.addEventListener("input", () => {
            const raw = parseFloat(slider.value);
            const value = p.scale !== undefined ? raw * p.scale : raw;
            const update: Partial<Record<string, number>> = {};
            update[p.key] = value;
            store.updateADSR(update as any);
            span.textContent = p.format(raw);
        });

        item.appendChild(slider);
        item.appendChild(span);
        verticalDiv.appendChild(item);
    }

    sliders.appendChild(verticalDiv);

    const canvasDiv = document.createElement("div");
    canvasDiv.className = "adsr-canvas";
    canvasDiv.id = "adsr-canvas-container";
    sliders.appendChild(canvasDiv);

    section.appendChild(sliders);
    return section;
}
