const TEXT = "TECH DEBT";
const BASE_SPEED = 3;

type HSL = { h: number; s: number; l: number };

let hue = 0;

function hslStr(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function getTextDimensions(
  ctx: CanvasRenderingContext2D,
  text: string,
): { width: number; height: number } {
  const metrics = ctx.measureText(text);
  return {
    width: metrics.width,
    height:
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
  };
}

export default function init(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;

  let x: number;
  let y: number;
  let vx: number;
  let vy: number;
  let color: HSL;

  function reset(
    w: number,
    h: number,
  ): void {
    // Random initial position in the central area (avoids spawning outside)
    x = w * (0.2 + Math.random() * 0.6);
    y = h * (0.2 + Math.random() * 0.6);

    // Random direction velocity
    const angle = Math.random() * 2 * Math.PI;
    vx = Math.cos(angle) * BASE_SPEED;
    vy = Math.sin(angle) * BASE_SPEED;

    hue = Math.random() * 360;
    color = { h: hue, s: 80, l: 60 };
  }

  function resize(): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // Buffer must match CSS size for crispness
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function rebound(): void {
    hue = (hue + 30 + Math.random() * 60) % 360;
    color = { h: hue, s: 80, l: 60 };
  }

  function tick(): void {
    resize();

    const w = canvas.width;
    const h = canvas.height;

    // Dynamic font size (scales with viewport)
    const fontSize = Math.max(24, Math.min(w, h) * 0.07);
    ctx.font = `bold ${fontSize}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
    ctx.textBaseline = "alphabetic";

    const dims = getTextDimensions(ctx, TEXT);

    // Update position
    x += vx;
    y += vy;

    // Edge collisions
    const padding = 8;
    const textLeft = x - dims.width / 2;
    const textRight = x + dims.width / 2;
    const textTop = y - dims.height / 2;
    const textBottom = y + dims.height / 2;

    if (textLeft < padding) {
      x = padding + dims.width / 2;
      vx = -vx;
      rebound();
    } else if (textRight > w - padding) {
      x = w - padding - dims.width / 2;
      vx = -vx;
      rebound();
    }

    if (textTop < padding) {
      y = padding + dims.height / 2;
      vy = -vy;
      rebound();
    } else if (textBottom > h - padding) {
      y = h - padding - dims.height / 2;
      vy = -vy;
      rebound();
    }

    // Draw
    ctx.clearRect(0, 0, w, h);

    // Subtle shadow
    ctx.shadowColor = hslStr(color.h, color.s, color.l);
    ctx.shadowBlur = 20;

    ctx.fillStyle = hslStr(color.h, color.s, color.l);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(TEXT, x, y);

    requestAnimationFrame(tick);
  }

  resize();
  const w = canvas.width;
  const h = canvas.height;
  reset(w, h);

  requestAnimationFrame(tick);
}
