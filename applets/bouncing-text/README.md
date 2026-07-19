# Bouncing Text

## Overview

A bold "TECH DEBT" label bounces across the canvas, rebounding off the edges with a flash of color and a soft glowing trail. Each collision produces an unpredictable hue cycle, making the text drift through the color spectrum over time. The applet is purely decorative and demand no interaction.

## Interaction

None. The animation runs autonomously from the moment the page loads.

## How it works

The animation runs in a single `requestAnimationFrame` loop. At the start of every frame the canvas buffer is resized to match the CSS dimensions (`canvas.clientWidth` / `canvas.clientHeight`), ensuring crisp text regardless of the viewport.

Text dimensions are measured each frame with `ctx.measureText()` — its `actualBoundingBoxAscent` and `actualBoundingBoxDescent` provide pixel-accurate boundaries for edge-collision detection. When the text would cross any edge, the velocity component is negated and a new hue is generated: `(hue + 30 + Math.random() * 60) % 360`, producing smooth but unpredictable colour transitions across the HSL wheel.

The font size scales dynamically with the viewport: `Math.max(24, Math.min(w, h) * 0.07)`.

Glow is achieved via `ctx.shadowColor` + `ctx.shadowBlur`, a lightweight built-in Canvas API feature that avoids the overhead of manual filter pipelines. The shadow colour tracks the current hue at high saturation (`hsl(…, 80%, 60%)`).

## File structure

| File | Role |
|---|---|
| `main.ts` | Single entry point — resize, update, draw loop |

## Technical notes

- `ctx.measureText()` is called every frame because the canvas size (and therefore the font size) may change during a responsive layout.
- The hue is stored as a plain number in the closure; no objects or state machines are needed for the colour transition.
