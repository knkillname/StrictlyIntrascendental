# Convex Blob

## Overview

An organic, ever-shifting mesh — constructed from a Delaunay triangulation — pulses over a procedurally generated Gaussian-blob texture. The points drift under Brownian noise and mutual repulsion, and react to the mouse cursor: repelled by default, attracted when the mouse button is held. The result is a living, amoeba-like form with glowing edges and soft dark interiors.

## Interaction

- **Mouse move**: points are repelled from the cursor, creating a wake as if the pointer pushes through a fluid.
- **Mouse down (hold)**: the force flips to attraction, pulling the mesh toward the cursor. A subtle halo ring appears around the pointer.
- **Visual feedback**: two concentric semi-transparent rings follow the cursor, indicating the current interaction radius.

## How it works

**Delaunay triangulation** (Bowyer-Watson algorithm, O(n²)) is recomputed every frame from the current point set. The algorithm begins with a super-triangle large enough to enclose all points, then inserts points one at a time: for each point, all triangles whose circumcircle contains the point are removed, leaving a star-shaped cavity that is re-triangulated by connecting the new point to each edge of the cavity boundary. The super-triangle is removed at the end.

The point count scales with the viewport: `⌊0.4 × √(w × h)⌋`.

**Procedural texture**. A `Float32Array` of `128×128` entries is precomputed at init time by summing 35 Gaussian blobs with random positions and standard deviations in `[5, 25]`. The array is normalised to `[0, 1]`. During each frame, the texture is sampled with bilinear interpolation at the centroid of each triangle (mapped to texture coordinates via `(x / w) × 128`).

**Triangle rendering**. Each triangle is filled with an HSL colour whose hue and lightness are derived from the texture sample:
- Hue mapped to `[210, 40]` (blue → red), inverted so darker areas appear warmer.
- Lightness mapped from the texture value.
- Saturation fixed at `25%`.

Triangles whose sampled lightness falls below a threshold are skipped, creating the organic "holes" in the mesh.

**Point physics**. Each frame:
1. **Particle–particle repulsion**: an inverse-square force proportional to `1 / dist²` is applied between every pair of points.
2. **Brownian noise**: a small random perturbation `±0.03` is added.
3. **Velocity cap**: speed is clamped to `maxSpeed = 2`.
4. **Edge damping**: points near the canvas walls have their velocity multiplied by 0.95 to keep them contained.
5. **Mouse force**: a vector toward (or away from) the cursor is added with magnitude `(MOUSE_RADIUS − dist) / MOUSE_RADIUS × strength`.

**Motion trail** replaces a full `clearRect`: the canvas is painted each frame with `rgba(9, 14, 19, 0.08)`, which composites to a gradual fade — producing a ghosting trail behind moving triangles. A radial-gradient vignette is overlaid to darken the edges of the canvas.

## File structure

| File | Role |
|---|---|
| `main.ts` | Single entry point — Delaunay triangulation, texture generation, physics, rendering |

## Technical notes

- The Bowyer-Watson implementation is self-contained and does not use any external geometry library.
- The super-triangle coordinates are recalculated whenever the canvas resizes to ensure the triangulation covers the full viewport.
- `Float32Array` is used for the texture grid instead of a 2D array to minimise memory overhead and simplify bilinear sampling.
