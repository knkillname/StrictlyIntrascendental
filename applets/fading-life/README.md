# Fading Life

## Overview

Conway's Game of Life with a twist: cells don't die instantly — they decay gracefully with a golden-ratio factor, leaving behind colourful fading trails that spread across the grid like a rainbow. Users can draw cells by hovering, stamp predefined patterns (R-pentomino, T-tetromino, 5-cell line) by clicking or dragging, and watch the emergent evolution unfold in amber-toned glow.

## Interaction

- **Hover**: cells under the cursor are set alive (white, hue=0), letting you paint life directly.
- **Click**: stamps one of three patterns (cycling on each click): R-pentomino, T-tetromino, or a 5-cell horizontal line.
- **Drag**: stamps patterns every 3 cells (centre-to-centre), allowing rapid pattern placement while dragging.
- **Right-click**: suppressed to prevent the browser context menu.

## How it works

**Grid**. Each cell is `CELL_SIZE = 8` px with `PADDING = 1` px between cells, producing a visible grid of `6×6` px live areas. The grid is a 2D array of numeric values: `≥ 1` for alive, `(0, 1)` for decaying, `0` for dead. The grid wraps toroidally — opposite edges are connected.

**Rules** follow the standard B3/S23 (birth on 3 neighbours, survival on 2 or 3 neighbours) with one modification: when a cell dies, its value is set to `DECAY = 0.618` (the golden ratio conjugate) instead of 0. Each subsequent tick the value is multiplied by `DECAY`, producing a smooth exponential fade. This creates visible ghost trails of recently dead cells.

**Hue inheritance**. When a new cell is born (exactly 3 neighbours), it takes the minimum hue among its living neighbours plus `π / 180` (≈ 1°), wrapping at 360°. This causes colour to flow gradually from the point of origin, creating spreading rainbow-like waves. Initial cells (placed by the user or by a stamp) start with hue `0` (white).

**Tick rate** is throttled to 24 fps (`TICK_MS = 1000 / 24`) via a cumulative-time check inside the `requestAnimationFrame` loop. The draw function runs every frame to render smooth decay fades, but the simulation (birth/survival/decay) only advances at 24 Hz.

**Stamp patterns** are defined as arrays of `[dx, dy]` offsets relative to the click point:
1. R-pentomino — 5 cells in a characteristic canoe-like shape.
2. T-tetromino — 4 cells in a T shape.
3. 5-cell line — a straight horizontal line.

The pattern index cycles on each placement.

**Glow**. Instead of `ctx.shadowBlur` (which can cause performance issues on a grid with hundreds of cells), a manual glow is drawn: a larger, semi-transparent circle behind each alive or decaying cell, followed by a smaller bright core. Glow colour uses `hsla(40, 90%, 65%, alpha)` with alpha proportional to the cell's value.

## File structure

| File | Role |
|---|---|
| `main.ts` | Single entry point — grid state, Game of Life logic, pattern stamping, rendering |

## Technical notes

- The golden ratio decay factor `0.618` was chosen empirically: larger values (e.g. `0.8`) produce trails that linger too long and obscure new generations; smaller values (e.g. `0.3`) vanish too quickly to create interesting patterns.
- The hue-inheritance formula (`min neighbour hue + π/180`) ensures neighbouring pixels slowly diverge, creating smooth gradients rather than blocks of uniform colour.
- `document.elementFromPoint()` is used to retrieve the canvas element's bounding rect on interaction, which handles scaling correctly regardless of the canvas's CSS sizing.
