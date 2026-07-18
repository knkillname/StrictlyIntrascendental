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

### No external dependencies

- Do not install runtime npm libraries. The final HTML must be 100%
  self-contained. esbuild inlines the code, but if there are external
  dependencies they get bundled in.
- Always prefer plain Canvas API. Do not use Three.js, PixiJS, D3, etc.
- If a small library is absolutely necessary, evaluate whether it can be
  included as an inline snippet in `main.ts` itself.

### Animations

- Use `requestAnimationFrame` for the loop.
- Each frame: `resize` (if canvas size changed), `update` (state),
  `draw` (render).
- Do not use `setInterval` or `setTimeout` for animation.
- Treat `canvas.width`/`canvas.height` as the buffer (actual pixels)
  and `canvas.clientWidth`/`canvas.clientHeight` as the CSS size.

## TypeScript style

### Mandatory rules

1. **strict mode enabled** (`tsconfig.json` already has it).
2. **No `any`** — use concrete types. If a generic type is needed,
   use `unknown` and narrow with guards.
3. **No `typing.Protocol`** — prefer `ABCMeta` for formal
   interfaces. For lightweight data structures, use types
   (`type` or `interface`) directly.
4. **No `console.log` in production code** — if debugging is needed,
   add `// DEBUG:` comments and remove them before the build.
5. **Variables and functions**: `camelCase`. Global constants: `UPPER_CASE`.
6. **Export only what is necessary** — each `main.ts` exports only `default`.
7. **No template literals** in the build script (`scripts/build.ts`) for
   constructing HTML. Use concatenation with `+` to avoid parsing
   conflicts with `${}` and backticks.
8. **Minimal instruction count** — fewer instructions is always better.
   Eliminate redundant branches, collapse equivalent expressions, and
   prefer direct computation over ceremony.
9. **Comments must be inlined and short** — only to translate a complex
   idea into simple language. Banner comments (multi-line blocks at the
   top of a file or section separators like `// ----`) are prohibited.
10. **Elegance is mandatory** — code must read like prose. Prefer
    `for…of` over indexed loops, destructure where it improves clarity,
    and keep each function focused on a single responsibility.

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
