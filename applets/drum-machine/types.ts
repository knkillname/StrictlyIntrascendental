export type DrumSound =
    | "bd" | "sd"
    | "lt" | "mt" | "ht"
    | "ch" | "oh"
    | "cp" | "rs"
    | "cb" | "cy";

export const DRUM_SOUNDS: readonly DrumSound[] = [
    "bd", "sd", "lt", "mt", "ht",
    "ch", "oh", "cp", "rs", "cb", "cy",
];

export const DRUM_LABELS: Record<DrumSound, string> = {
    bd: "Bass Drum",
    sd: "Snare",
    lt: "Low Tom",
    mt: "Mid Tom",
    ht: "High Tom",
    ch: "Closed HH",
    oh: "Open HH",
    cp: "Clap",
    rs: "Rim Shot",
    cb: "Cowbell",
    cy: "Cymbal",
};

export const DRUM_COLORS: Record<DrumSound, string> = {
    bd: "#e74c3c",
    sd: "#e67e22",
    lt: "#f1c40f",
    mt: "#2ecc71",
    ht: "#1abc9c",
    ch: "#3498db",
    oh: "#9b59b6",
    cp: "#e91e63",
    rs: "#00bcd4",
    cb: "#ff5722",
    cy: "#795548",
};

export interface DrumMachineState {
    bpm: number;
    playing: boolean;
    currentStep: number;
    steps: Record<DrumSound, readonly boolean[]>;
    volumes: Record<DrumSound, number>;
    masterVolume: number;
}

function makePattern(init?: (i: number) => boolean): readonly boolean[] {
    const arr = new Array<boolean>(16);
    for (let i = 0; i < 16; i++) arr[i] = init ? init(i) : false;
    return arr;
}

export function createDefaultState(): DrumMachineState {
    const steps = {} as Record<DrumSound, readonly boolean[]>;
    const volumes = {} as Record<DrumSound, number>;
    for (const s of DRUM_SOUNDS) {
        steps[s] = makePattern();
        volumes[s] = 0.8;
    }
    steps.bd = makePattern((i) => i % 4 === 0);
    steps.ch = makePattern((i) => i % 2 === 0);
    steps.sd = makePattern((i) => i % 8 === 4);
    return { bpm: 120, playing: false, currentStep: -1, steps, volumes, masterVolume: 0.5 };
}
