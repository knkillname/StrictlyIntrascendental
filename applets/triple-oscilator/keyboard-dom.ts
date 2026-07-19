const START_MIDI = 36;       // C2
const TOTAL_SEMITONES = 49;  // 4 octavas (C2 → C6)
const WHITE_KEY_COUNT = 29;
const BLACK_KEY_INDICES = [1, 3, 6, 8, 10];
const WHITE_WIDTH = 100 / WHITE_KEY_COUNT;
const BLACK_WIDTH = WHITE_WIDTH * 0.6;

export interface KeyboardCallbacks {
    onNoteOn: (pointerId: number, midi: number, element: HTMLElement, velocity: number) => void;
    onNoteOff: (pointerId: number, midi: number, element: HTMLElement) => void;
}

export class Keyboard {
    readonly midiToElement = new Map<number, HTMLElement>();
    private pointerNotes = new Map<number, HTMLElement>();
    private isMouseDown = false;
    private el: HTMLElement;

    constructor(container: HTMLElement, private cb: KeyboardCallbacks) {
        this.el = document.createElement("div");
        this.el.id = "keyboard";
        container.appendChild(this.el);
        this.buildKeys();
        this.bindEvents();
    }

    private buildWhiteIndexMap(): number[] {
        const map: number[] = [];
        let idx = 0;
        for (let i = 0; i < TOTAL_SEMITONES; i++) {
            const isBlack = BLACK_KEY_INDICES.includes(i % 12);
            map.push(isBlack ? -1 : idx++);
        }
        return map;
    }

    private buildKeys(): void {
        const whiteIdx = this.buildWhiteIndexMap();

        for (let i = 0; i < TOTAL_SEMITONES; i++) {
            if (BLACK_KEY_INDICES.includes(i % 12)) continue;
            const midi = START_MIDI + i;
            const key = document.createElement("div");
            key.className = "key white";
            key.dataset.midi = String(midi);
            this.el.appendChild(key);
            this.midiToElement.set(midi, key);
        }

        for (let i = 0; i < TOTAL_SEMITONES; i++) {
            if (!BLACK_KEY_INDICES.includes(i % 12)) continue;
            const midi = START_MIDI + i;
            const prev = whiteIdx[i - 1];
            const left = ((prev + 1) * WHITE_WIDTH) - (BLACK_WIDTH / 2);
            const key = document.createElement("div");
            key.className = "key black";
            key.dataset.midi = String(midi);
            key.style.left = left.toFixed(4) + "%";
            key.style.width = BLACK_WIDTH.toFixed(4) + "%";
            this.el.appendChild(key);
            this.midiToElement.set(midi, key);
        }
    }

    private bindEvents(): void {
        this.el.addEventListener("pointerdown", (e: PointerEvent) => {
            e.preventDefault();
            this.isMouseDown = true;
            const key = (e.target as HTMLElement).closest(".key") as HTMLElement | null;
            if (!key) return;
            const midi = parseInt(key.dataset.midi!, 10);
            const rect = key.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
            const velocity = 0.3 + ratio * 0.7;
            const prev = this.pointerNotes.get(e.pointerId);
            if (prev) {
                this.cb.onNoteOff(e.pointerId, parseInt(prev.dataset.midi!, 10), prev);
            }
            this.pointerNotes.set(e.pointerId, key);
            key.classList.add("active");
            this.cb.onNoteOn(e.pointerId, midi, key, velocity);
        });

        this.el.addEventListener("pointermove", (e: PointerEvent) => {
            if (!this.isMouseDown) return;
            const elem = document.elementFromPoint(e.clientX, e.clientY);
            const key = elem?.closest(".key") as HTMLElement | null;
            const prev = this.pointerNotes.get(e.pointerId);
            if (key) {
                if (prev !== key) {
                    if (prev) {
                        prev.classList.remove("active");
                        this.cb.onNoteOff(e.pointerId, parseInt(prev.dataset.midi!, 10), prev);
                    }
                    key.classList.add("active");
                    this.pointerNotes.set(e.pointerId, key);
                    const rect2 = key.getBoundingClientRect();
                    const ratio2 = Math.max(0, Math.min(1, (e.clientY - rect2.top) / rect2.height));
                    this.cb.onNoteOn(e.pointerId, parseInt(key.dataset.midi!, 10), key, 0.3 + ratio2 * 0.7);
                }
            } else if (prev) {
                prev.classList.remove("active");
                this.cb.onNoteOff(e.pointerId, parseInt(prev.dataset.midi!, 10), prev);
                this.pointerNotes.delete(e.pointerId);
            }
        });

        const onUpOrCancel = (e: PointerEvent) => {
            if (!this.isMouseDown) return;
            this.isMouseDown = false;
            const prev = this.pointerNotes.get(e.pointerId);
            if (prev) {
                prev.classList.remove("active");
                this.cb.onNoteOff(e.pointerId, parseInt(prev.dataset.midi!, 10), prev);
                this.pointerNotes.delete(e.pointerId);
            }
        };

        document.addEventListener("pointerup", onUpOrCancel);
        document.addEventListener("pointercancel", onUpOrCancel);
    }
}
