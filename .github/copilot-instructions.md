# StrictlyIntrascendental — Technical & style guide

## Repository purpose

Collection of TypeScript applets compiled to self-contained HTML for
embedding in Google Sites via "Embed code". Each applet is an
interactive piece with no practical utility: a moving virtual museum.

## Stack

- **TypeScript** 5.x — source language, strict mode.
- **esbuild** — bundler. Compiles each `applets/<name>/main.ts` → IIFE.
- **Canvas API** — graphics engine. No external visualization libraries.
- **Self-contained HTML** — the generated HTML must not depend on CDNs,
  external files, or remote resources.

## General conventions

### One folder per applet

```
applets/<applet-name>/
├── main.ts          ← Entry point (export default AppletInit)
└── ...              ← Auxiliary files if the applet requires them
```

The folder name determines the output HTML filename
(`dist/<applet-name>.html`) and the page title.

### Entry point (`main.ts`)

Each applet must default-export a function with this signature:

```ts
import type { AppletInit } from "../common.js";

const init: AppletInit = (canvas: HTMLCanvasElement) => {
  // start the animation
};

export default init;
```

- The function receives the `<canvas>` from the generated HTML.
- It must start the animation loop (normally with `requestAnimationFrame`).
- It must not assume anything about the canvas size; it should use
  `canvas.clientWidth / clientHeight` and resize the buffer with
  `canvas.width = canvas.clientWidth` (and analogously for height).
- On resize, only update `canvas.width`/`canvas.height` to match
  `clientWidth`/`clientHeight`. Do not reinitialize animation state
  unless the applet explicitly requires it.

### No external dependencies

- Do not install runtime npm libraries. The final HTML must be 100%
  self-contained. esbuild inlines the code, but if there are external
  dependencies they get bundled in.
- Always prefer plain Canvas API. Do not use Three.js, PixiJS, D3, etc.
- If a utility under ~50 lines is strictly required and has no npm
  equivalent, paste it directly into `main.ts` with a `// SOURCE:`
  comment. Do not add npm dependencies under any circumstance.

### Animations

- Use `requestAnimationFrame` for the loop.
- Each frame: `resize` (if canvas size changed), `update` (state),
  `draw` (render).
- Do not use `setInterval` or `setTimeout` for animation.
- Treat `canvas.width`/`canvas.height` as the buffer (actual pixels)
  and `canvas.clientWidth`/`canvas.clientHeight` as the CSS size.

## TypeScript style

### Mandatory rules — ordered by importance

*These three principles are non-negotiable and override any other rule:*

1. **Functional programming** — no classes, no `this`, no mutation.
   Pure functions are the default: same input → same output, zero side
   effects. The animation loop (`init`) is the sole exception — it is
   the impure boundary where canvas drawing, `requestAnimationFrame`,
   and resize handling live. Keep all logic, state transitions, and
   rendering computations in pure functions; let `init` wire them.
   Compose small functions with `pipe`/`compose` or direct chaining.
   Use `map`, `filter`, `reduce`, `flatMap`; avoid imperative loops.
   State flows through function arguments and return values only.
   Prefer `const`; if you must rebind, use `let` scoped tightly.
   Data structures are immutable — `readonly` arrays, `Readonly<T>`,
   spread (`[...arr, item]`) instead of `push`.
   When Rules 1, 2, and 3 conflict, Rule 1 takes precedence,
   then Rule 2, then Rule 3. Never sacrifice immutability for brevity.

2. **Minimal instruction count** — the supreme metric. Fewer
   instructions is always, always better. Eliminate every redundant
   branch, collapse equivalent expressions into one, prefer direct
   computation over ceremony. If a function can be a one-liner, make
   it a one-liner. No dead code, no unused variables, no noise.

3. **Elegance is mandatory** — code must read like prose. Every line
   must justify its existence. Destructure where it improves clarity,
   and keep each function focused on a single responsibility. A reader
   should understand the intent in one pass, without deciphering.

*The remaining rules support the three above:*

4. **strict mode enabled** (`tsconfig.json` already has it).
5. **No `any`** — use concrete types. If a generic type is needed,
   use `unknown` and narrow with guards.
6. **Prefer `type` for data shapes**; use `interface` only when
   declaration merging is needed. Avoid abstract classes and OOP
   hierarchy patterns — model behavior with plain functions.
7. **No `console.log` in production code** — if debugging is needed,
   add `// DEBUG:` comments and remove them before the build.
8. **Variables and functions**: `camelCase`. Global constants: `UPPER_CASE`.
9. **Export only what is necessary** — each `main.ts` exports only `default`.
10. **No template literals** in the build script (`scripts/build.ts`) for
    constructing HTML. Use concatenation with `+` to avoid parsing
    conflicts with `${}` and backticks.
11. **Comments must be inlined and short** — only to translate a complex
    idea into simple language. Banner comments (multi-line blocks at the
    top of a file or section separators like `// ----`) are prohibited.

### Canvas: best practices

- Detect collisions with `ctx.measureText()` for text, not fixed sizes.
- Scale font size with the viewport:
  `Math.max(16, Math.min(w, h) * 0.05)`.
- Call `ctx.clearRect(0, 0, w, h)` at the start of each frame.
- Do not assume `devicePixelRatio` unless the applet requires high density;
  by default keep a 1:1 ratio with CSS (the HTML looks good in Google Sites
  even with the iframe's own scaling).
- For shadows/glow, use `ctx.shadowColor` + `ctx.shadowBlur` (they are
  cheap and do not require filters).

## Color palette

- **Background**: `#090e13` — very dark blue-grey, used as the HTML/CSS
  `background` and for `ctx.clearRect` fallback.
- **Primary**: `#f9f9f9` — near-white, used for all main text, particle
  cores, and primary foreground elements.
- Accent colors (HSL with varied hue) are reserved for glow, shadows,
  and secondary decorative elements.

## Build process

The `scripts/build.ts` script:

1. Scans `applets/` for subdirectories.
2. For each subdirectory with `main.ts`:
   a. Calls esbuild: bundle, IIFE, `globalName: "__applet"`.
   b. Wraps the resulting JS in an HTML template.
   c. Adds a final line that invokes `__applet.default(canvas)`.
3. Writes `dist/<name>.html`.

Do not modify the build script unless strictly necessary.
If the HTML template needs changing, edit the `htmlTemplate()` function
in `scripts/build.ts`.

## Verification

```bash
npm run build
# Open dist/<applet>.html in the browser
```

There is no dev server; each HTML is opened directly with
`file://` or copied to Google Sites to test the real embedding.

## How to create a new applet (summary)

1. `mkdir applets/my-applet`
2. `touch applets/my-applet/main.ts`
3. Implement `export default function init(canvas: HTMLCanvasElement): void`
4. `npm run build`
5. Verify in browser: `dist/my-applet.html`
6. Copy content to Google Sites → Embed code
