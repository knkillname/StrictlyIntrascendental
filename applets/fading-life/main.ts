import type { AppletInit } from "../common.js";

const CELL_SIZE = 8;
const PADDING = 1;
const PITCH = CELL_SIZE + PADDING;
const DECAY = 0.618;
const TICK_MS = 1000 / 24;
const GLOW_PAD = 3; // px extra para la capa de glow (sin shadowBlur)
// Probabilidad de que una celda nazca encendida con ruido.
// p=0.12 produce dinámica activa y duradera (ver scripts/find-optimal-density.ts).
const INITIAL_DENSITY = 0.12;

const R_PENTOMINO: readonly (readonly [number, number])[] = [
    [1, 0], [2, 0],
    [0, 1], [1, 1],
    [1, 2],
];

const T_TETROMINO: readonly (readonly [number, number])[] = [
    [0, 0], [1, 0], [2, 0],
    [1, 1],
];

const LINE_5: readonly (readonly [number, number])[] = [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
];

const PATTERNS = [R_PENTOMINO, T_TETROMINO, LINE_5] as const;

let cols = 0;
let rows = 0;
let grid: number[][] = [];
let nextGrid: number[][] = [];
let hueGrid: number[][] = [];
let nextHueGrid: number[][] = [];
let mouseCol = -1;
let mouseRow = -1;
let lastHoverCol = -1;
let lastHoverRow = -1;
let mouseDown = false;
let lastDragCol = -1;
let lastDragRow = -1;
let patternIndex = 0;
let lastTick = 0;

const DRAG_STEP = 3; // insertar patrón cada DRAG_STEP celdas al arrastrar

function initGrid(): void {
    grid = Array.from({ length: cols }, () =>
        Array.from({ length: rows }, () => Math.random() < INITIAL_DENSITY ? 1 : 0),
    );
    nextGrid = Array.from({ length: cols }, () => new Array(rows).fill(0));
    hueGrid = Array.from({ length: cols }, () => new Array(rows).fill(0));
    nextHueGrid = Array.from({ length: cols }, () => new Array(rows).fill(0));
}

function update(): void {
    if (mouseCol >= 0 && mouseRow >= 0 && mouseCol < cols && mouseRow < rows) {
        if (mouseCol !== lastHoverCol || mouseRow !== lastHoverRow) {
            grid[mouseCol][mouseRow] = 1;
            hueGrid[mouseCol][mouseRow] = 0;
            lastHoverCol = mouseCol;
            lastHoverRow = mouseRow;
        }
    }

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            let neighbors = 0;
            let minHue = Infinity;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = (x + dx + cols) % cols;
                    const ny = (y + dy + rows) % rows;
                    if (grid[nx][ny] === 1) {
                        neighbors++;
                        const h = hueGrid[nx][ny];
                        if (h < minHue) minHue = h;
                    }
                }
            }

            const alive = grid[x][y] === 1;
            if (alive) {
                nextGrid[x][y] = neighbors === 2 || neighbors === 3 ? 1 : DECAY;
                nextHueGrid[x][y] = hueGrid[x][y];
            } else if (neighbors === 3) {
                nextGrid[x][y] = 1;
                const newHue = minHue + Math.PI / 180;
                nextHueGrid[x][y] = newHue < 2 * Math.PI ? newHue : newHue - 2 * Math.PI;
            } else {
                nextGrid[x][y] = grid[x][y] * DECAY;
                nextHueGrid[x][y] = hueGrid[x][y];
            }
        }
    }
    [grid, nextGrid] = [nextGrid, grid];
    [hueGrid, nextHueGrid] = [nextHueGrid, hueGrid];
}

function draw(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (let x = 0; x < cols; x++) {
        const px = x * PITCH;
        for (let y = 0; y < rows; y++) {
            const lum = grid[x][y];
            if (lum <= 0.001) continue;
            const cx = px + CELL_SIZE / 2;
            const cy = y * PITCH + CELL_SIZE / 2;

            if (lum === 1) {
                // Glow ámbar (círculo)
                ctx.beginPath();
                ctx.arc(cx, cy, CELL_SIZE / 2 + GLOW_PAD, 0, Math.PI * 2);
                ctx.fillStyle = "hsla(40, 90%, 65%, 0.25)";
                ctx.fill();
                // Núcleo blanco
                ctx.fillStyle = "#f9f9f9";
                ctx.fillRect(px, y * PITCH, CELL_SIZE, CELL_SIZE);
            } else {
                const hueDeg = hueGrid[x][y] * 180 / Math.PI;
                const l = 8 + lum * 67;
                // Glow circular con el color de la célula
                ctx.beginPath();
                ctx.arc(cx, cy, CELL_SIZE / 2 + GLOW_PAD, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${hueDeg.toFixed(1)}, 80%, ${l.toFixed(1)}%, ${(lum * 0.3).toFixed(3)})`;
                ctx.fill();
                // Núcleo tintado con el color de la célula
                ctx.fillStyle = `hsl(${hueDeg.toFixed(1)}, 80%, ${l.toFixed(1)}%)`;
                ctx.fillRect(px, y * PITCH, CELL_SIZE, CELL_SIZE);
            }
        }
    }
}

function insertPattern(
    cx: number, cy: number,
    pattern: readonly (readonly [number, number])[],
): void {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [dx, dy] of pattern) {
        if (dx < minX) minX = dx;
        if (dx > maxX) maxX = dx;
        if (dy < minY) minY = dy;
        if (dy > maxY) maxY = dy;
    }
    const centerX = Math.floor((minX + maxX) / 2);
    const centerY = Math.floor((minY + maxY) / 2);

    for (const [dx, dy] of pattern) {
        const nx = (cx + dx - centerX + cols) % cols;
        const ny = (cy + dy - centerY + rows) % rows;
        grid[nx][ny] = 1;
        hueGrid[nx][ny] = 0;
    }
}

const init: AppletInit = (canvas) => {
    const ctx = canvas.getContext("2d")!;

    function resize(): void {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (w === canvas.width && h === canvas.height) return;
        canvas.width = w;
        canvas.height = h;
        cols = Math.floor(w / PITCH);
        rows = Math.floor(h / PITCH);
        initGrid();
    }

    function tick(now: number): void {
        resize();
        if (now - lastTick >= TICK_MS) {
            update();
            lastTick = now - (now - lastTick) % TICK_MS;
        }
        draw(ctx);
        requestAnimationFrame(tick);
    }

    canvas.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const col = Math.floor(((e.clientX - rect.left) * scaleX) / PITCH);
        const row = Math.floor(((e.clientY - rect.top) * scaleY) / PITCH);
        mouseCol = col;
        mouseRow = row;

        if (mouseDown && col >= 0 && row >= 0 && col < cols && row < rows) {
            if (Math.abs(col - lastDragCol) >= DRAG_STEP || Math.abs(row - lastDragRow) >= DRAG_STEP) {
                insertPattern(col, row, PATTERNS[patternIndex]);
                patternIndex = (patternIndex + 1) % PATTERNS.length;
                lastDragCol = col;
                lastDragRow = row;
            }
        }
    });

    canvas.addEventListener("mousedown", (e) => {
        mouseDown = true;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const col = Math.floor(((e.clientX - rect.left) * scaleX) / PITCH);
        const row = Math.floor(((e.clientY - rect.top) * scaleY) / PITCH);
        if (col >= 0 && row >= 0 && col < cols && row < rows) {
            insertPattern(col, row, PATTERNS[patternIndex]);
            patternIndex = (patternIndex + 1) % PATTERNS.length;
            lastDragCol = col;
            lastDragRow = row;
        }
    });

    canvas.addEventListener("mouseup", () => {
        mouseDown = false;
    });

    canvas.addEventListener("mouseleave", () => {
        mouseCol = -1;
        mouseRow = -1;
        lastHoverCol = -1;
        lastHoverRow = -1;
        mouseDown = false;
    });

    // Prevenir el menú contextual del navegador al arrastrar
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    resize();
    requestAnimationFrame(tick);
};

export default init;
