/**
 * Shared types for all applets.
 *
 * Each applet exposes an `init` function as its default export,
 * which receives the `<canvas>` from the generated HTML and starts the animation.
 *
 * @example
 * ```ts
 * export default function init(canvas: HTMLCanvasElement): void {
 *   // start animation…
 * }
 * ```
 */

/** Signature that every applet must export by default. */
export type AppletInit = (canvas: HTMLCanvasElement) => void;
