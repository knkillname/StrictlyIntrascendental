export interface QwertyCallbacks {
    onNoteOn: (code: string, midi: number) => void;
    onNoteOff: (code: string, midi: number) => void;
}

function buildKeyMap(): Map<string, number> {
    const m = new Map<string, number>();

    // Fila inferior: naturales C3 → F4
    m.set("IntlBackslash", 48); // C3
    m.set("KeyZ", 50);          // D3
    m.set("KeyX", 52);          // E3
    m.set("KeyC", 53);          // F3
    m.set("KeyV", 55);          // G3
    m.set("KeyB", 57);          // A3
    m.set("KeyN", 59);          // B3
    m.set("KeyM", 60);          // C4
    m.set("Comma", 62);         // D4
    m.set("Period", 64);        // E4
    m.set("Minus", 65);         // F4

    // Fila central: sostenidos
    m.set("KeyA", 49);          // C#3
    m.set("KeyS", 51);          // D#3
    m.set("KeyF", 54);          // F#3
    m.set("KeyG", 56);          // G#3
    m.set("KeyH", 58);          // A#3
    m.set("KeyK", 61);          // C#4
    m.set("KeyL", 63);          // D#4

    // Fila superior: naturales C4 → E5
    m.set("KeyQ", 60);          // C4
    m.set("KeyW", 62);          // D4
    m.set("KeyE", 64);          // E4
    m.set("KeyR", 65);          // F4
    m.set("KeyT", 67);          // G4
    m.set("KeyY", 69);          // A4
    m.set("KeyU", 71);          // B4
    m.set("KeyI", 72);          // C5
    m.set("KeyO", 74);          // D5
    m.set("KeyP", 76);          // E5

    // Números: sostenidos superiores
    m.set("Digit2", 61);        // C#4
    m.set("Digit3", 63);        // D#4
    m.set("Digit5", 66);        // F#4
    m.set("Digit6", 68);        // G#4
    m.set("Digit7", 70);        // A#4
    m.set("Digit9", 73);        // C#5
    m.set("Digit0", 75);        // D#5

    return m;
}

export function setupQwerty(
    midiToElement: Map<number, HTMLElement>,
    callbacks: QwertyCallbacks,
): () => void {
    const keyMap = buildKeyMap();
    const activeCodes = new Set<string>();
    const activeMidis = new Set<number>();

    function onKeyDown(e: KeyboardEvent): void {
        const midi = keyMap.get(e.code);
        if (midi === undefined) return;
        e.preventDefault();
        if (activeCodes.has(e.code)) return;
        if (e.repeat) return;
        activeCodes.add(e.code);
        activeMidis.add(midi);
        const el = midiToElement.get(midi);
        if (el) el.classList.add("active");
        callbacks.onNoteOn(e.code, midi);
    }

    function onKeyUp(e: KeyboardEvent): void {
        const midi = keyMap.get(e.code);
        if (midi === undefined) return;
        e.preventDefault();
        activeCodes.delete(e.code);
        activeMidis.delete(midi);
        const el = midiToElement.get(midi);
        if (el) el.classList.remove("active");
        callbacks.onNoteOff(e.code, midi);
    }

    function onBlur(): void {
        for (const midi of activeMidis) {
            const el = midiToElement.get(midi);
            if (el) el.classList.remove("active");
        }
        for (const code of activeCodes) {
            callbacks.onNoteOff(code, keyMap.get(code)!);
        }
        activeCodes.clear();
        activeMidis.clear();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        window.removeEventListener("blur", onBlur);
    };
}
