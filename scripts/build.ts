/**
 * Build script: compiles each TypeScript applet into a self-contained HTML.
 *
 * Reads applets/<name>/main.ts, bundles it with esbuild (IIFE),
 * and outputs dist/<name>.html with the JS inlined,
 * ready to copy-paste into Google Sites ("Embed code").
 */

import * as esbuild from "esbuild";
import { readdirSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APPLETS_DIR = join(ROOT, "applets");
const DIST_DIR = join(ROOT, "dist");

/** HTML template that wraps each applet. The CSS provides a full-screen canvas. */
function htmlTemplate(title: string, jsCode: string): string {
    return [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '  <meta charset="UTF-8">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '  <title>' + title + '</title>',
        '  <style>',
        '    * { margin: 0; padding: 0; box-sizing: border-box; }',
        '    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }',
        '    canvas { display: block; width: 100%; height: 100%; }',
        '  </style>',
        '</head>',
        '<body>',
        '  <canvas id="c"></canvas>',
        '  <script>',
        jsCode,
        '// Invoke the applet passing it the canvas',
        'var _canvas = document.getElementById("c");',
        'if (_canvas) __applet.default(_canvas);',
        '<' + '/script>',
        '</body>',
        '</html>',
    ].join("\n");
}

function appletNameFromDir(dir: string): string {
    return dir.replace(/[_-]/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

async function buildApplet(appletDir: string): Promise<void> {
    const entry = join(APPLETS_DIR, appletDir, "main.ts");
    if (!existsSync(entry)) {
        console.warn("  Skipping \"" + appletDir + "\": no main.ts found");
        return;
    }

    console.log("  Building \"" + appletDir + "\"...");

    const result = await esbuild.build({
        entryPoints: [entry],
        bundle: true,
        minify: false,
        target: "es2020",
        format: "iife",
        globalName: "__applet",
        write: false,
        logLevel: "error",
    });

    const jsCode = result.outputFiles[0].text;
    const title = appletNameFromDir(appletDir);
    const html = htmlTemplate(title, jsCode);

    const outFile = join(DIST_DIR, appletDir + ".html");
    mkdirSync(DIST_DIR, { recursive: true });
    writeFileSync(outFile, html, "utf-8");
    console.log("  Generated " + appletDir + ".html (" + jsCode.length + " bytes JS)");
}

async function main() {
    console.log("StrictlyIntrascendental applets build\n");

    if (!existsSync(APPLETS_DIR)) {
        console.error("applets/ directory does not exist");
        process.exit(1);
    }

    const entries = readdirSync(APPLETS_DIR, { withFileTypes: true });
    const appletDirs = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .filter((name) => !name.startsWith("."));

    if (appletDirs.length === 0) {
        console.log("(No applets to build)");
        return;
    }

    for (const dir of appletDirs) {
        await buildApplet(dir);
    }

    console.log("\nBuild complete: " + appletDirs.length + " applet(s) in dist/");
}

main().catch((err) => {
    console.error("Build error:", err);
    process.exit(1);
});
