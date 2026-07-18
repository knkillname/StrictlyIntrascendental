// Shared signature for all applet entry points: receives the <canvas>, starts the animation loop.
export type AppletInit = (canvas: HTMLCanvasElement) => void;
