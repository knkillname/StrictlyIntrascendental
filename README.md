# StrictlyIntrascendental

No databases, no microservices, no corporate APIs.
Just pure, abstract computer science reduced to dynamic toys
that will consume the visitor's CPU in beautifully irrelevant ways.

---

## What is this?

A collection of **applets** written in **TypeScript**, each compiled into a single
**self-contained HTML** file. No external dependencies, no CDNs, nothing
but a file you can copy and paste into **Google Sites** using the
"Embed code" tool.

They are pieces of a moving virtual museum: they solve no useful problem,
they exist only to give site visitors a moment of amusement.

## Quick Start

```bash
npm install       # install dev tools (once)
npm run build     # compile all applets → dist/
open dist/*.html  # pick any, open in browser
```

That's it. No dev server, no configuration — each HTML file is self-contained.
To publish, copy the file's source into **Google Sites → Insert → Embed code**.

## Stack

| Tool | Purpose |
|------|---------|
| **TypeScript** 5.x | Source language for each applet |
| **esbuild** | Ultra-fast bundler that compiles each applet to a single JS |
| **tsx** | Runs the build script (direct TypeScript, no pre-compilation) |
| **Canvas API** | Applet graphics engine (browser-native, no libraries) |

## Project structure

```
├── applets/
│   └── <applet-name>/
│       └── main.ts          ← Applet entry point
├── scripts/
│   └── build.ts             ← Build script
├── dist/                    ← Generated HTML files (not versioned)
├── .github/
│   └── copilot-instructions.md  ← Technical & style guide
├── package.json
├── tsconfig.json
└── README.md
```

## How to build

```bash
npm install       # once
npm run build     # generates dist/<each-applet>.html
```

Each `.html` file in `dist/` is self-contained:

1. Open it in the browser to test.
2. Copy the entire content.
3. In Google Sites: **Insert → Embed code**.
4. Paste the HTML.

## How to create a new applet

1. Create a folder in `applets/`, e.g. `applets/my-applet/`.
2. Write `main.ts` with an `export default` function:

```ts
import type { AppletInit } from "../common.js";

const init: AppletInit = (canvas: HTMLCanvasElement) => {
  // Your animation here
};

export default init;
```

3. Run `npm run build` → you get `dist/my-applet.html`.

## License

MIT &copy; 2026 Mario Abarca
