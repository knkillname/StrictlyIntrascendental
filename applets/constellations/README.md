# Constellations

## Overview

A field of drifting particles twinkles against a dark background, connected by faint lines when they pass close to each other — forming ephemeral constellation-like patterns. Moving the mouse (or dragging a finger on touch devices) draws the particles closer, as if the cursor exerts a magnetic pull.

## Interaction

- **Mouse move / touch drag**: particles within a 180 px radius are attracted toward the cursor with a force proportional to their proximity.
- **Mouse leave / touch end**: the attraction ceases; particles return to drifting freely.

## How it works

**Particle count** is scaled to the viewport: `⌊0.25 × √(w × h)⌋`. This keeps the visual density balanced across small and large screens without hard-coding a fixed number.

**Motion**. Each particle stores a position and a velocity that is damped by 0.98 every frame (simulating friction) and perturbed by uniform Brownian noise in the range `±0.025`. The noise ensures trajectories are organic and never settle into a straight line.

**Proximity lines**. Every pair of particles is compared each frame. If the Euclidean distance is below `MAX_DISTANCE = 110` px, a line is drawn with an alpha value that fades linearly with distance: `1 − dist / MAX_DISTANCE`. This falloff creates a soft, atmospheric glow between nearby particles.

**Rendering**. Each particle is drawn as three concentric circles:
1. A large semi-transparent outer glow (the twinkling colour, radius ~4× core).
2. A mid ring (radius ~2× core, lower alpha).
3. A bright white core (`#f9f9f9`) at full opacity.

The alpha of the outer layers oscillates with `Math.sin(time + twinklePhase)`, giving each particle an independent, asynchronous twinkle.

**Colour mapping**. Particle hue is mapped to its radius: smaller particles get warm hues (10–50°), larger particles get cool hues (205–230°). This creates a natural-looking spread that avoids a uniform tint.

**Mouse magnetism**. On each frame the distance from every particle to the cursor is computed. If inside `MOUSE_RADIUS = 180` px, an acceleration vector toward the cursor is added with magnitude `(MOUSE_RADIUS − dist) / MOUSE_RADIUS × 0.4`. The resulting velocity is then damped and clamped, preventing particles from collapsing into a single point.

## File structure

| File | Role |
|---|---|
| `main.ts` | Single entry point — particle state, proximity logic, mouse interaction, rendering |

## Technical notes

- The particle array is rebuilt when the canvas resizes (e.g. on orientation change) by calling `createParticles()`. Resizing mid-animation would otherwise cause density imbalances.
- No spatial index (quadtree, grid) is used for proximity detection — the particle count is kept modest enough that an O(n²) pairwise comparison runs comfortably at 60 fps.
- The twinkle phase is seeded at particle creation, so particles start at different points in their cycle rather than twinkling in lockstep.
