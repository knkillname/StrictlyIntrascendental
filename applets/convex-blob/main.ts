type Pt = { x: number; y: number };
type MovingPt = Pt & { vx: number; vy: number };
type Tri = [number, number, number];

const NUM_BLOBS = 35;
const DAMPING = 0.95;
const LUMINANCE_THRESHOLD = 0.02;

// Bowyer-Watson Delaunay triangulation — O(n²), compact for ~50 pts.
function edgeKey(a: number, b: number): string {
    return a < b ? a + "," + b : b + "," + a;
}

function triangulate(pts: Pt[]): Tri[] {
    const n = pts.length;
    if (n < 3) return [];

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    }
    const margin = Math.max(maxX - minX || 1, maxY - minY || 1) * 20;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    // Super-triangle vertices appended after real points.
    const sA = n, sB = n + 1, sC = n + 2;
    const all: Pt[] = [
        ...pts,
        { x: midX - margin, y: midY - margin },
        { x: midX + margin, y: midY - margin },
        { x: midX, y: midY + margin },
    ];
    let tris: Tri[] = [[sA, sB, sC]];

    // circumcircle test: returns true if (px,py) lies inside circumcircle of tri.
    function inCircle(tri: Tri, px: number, py: number): boolean {
        const [ai, bi, ci] = tri;
        const ax = all[ai].x, ay = all[ai].y;
        const bx = all[bi].x, by = all[bi].y;
        const cx = all[ci].x, cy = all[ci].y;
        const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
        if (Math.abs(d) < 1e-12) return false;
        const a2 = ax * ax + ay * ay;
        const b2 = bx * bx + by * by;
        const c2 = cx * cx + cy * cy;
        const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
        const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
        const r2 = (ax - ux) ** 2 + (ay - uy) ** 2;
        return (px - ux) ** 2 + (py - uy) ** 2 < r2 + 1e-10;
    }

    for (let i = 0; i < n; i++) {
        const { x: px, y: py } = all[i];
        // Collect triangles whose circumcircle contains the new point.
        const bad: number[] = [];
        for (let t = 0; t < tris.length; t++) {
            if (inCircle(tris[t], px, py)) bad.push(t);
        }

        // Boundary edges appear exactly once across all bad triangles.
        const edgeCount = new Map<string, number>();
        for (const t of bad) {
            const [a, b, c] = tris[t];
            for (const [v1, v2] of [[a, b], [b, c], [c, a]] as [number, number][]) {
                const k = edgeKey(v1, v2);
                edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1);
            }
        }
        const hole: [number, number][] = [];
        for (const [k, cnt] of edgeCount) {
            if (cnt === 1) hole.push(k.split(",").map(Number) as [number, number]);
        }

        // Remove bad triangles (reverse order to preserve indices).
        for (let t = bad.length - 1; t >= 0; t--) tris.splice(bad[t], 1);

        // Fill hole with new triangles fanning from the inserted point.
        for (const [a, b] of hole) tris.push([a, b, i]);
    }

    // Discard triangles that touch the super-triangle.
    return tris.filter((t) => t[0] < n && t[1] < n && t[2] < n);
}

// Circumcenter of triangle (ax,ay)–(bx,by)–(cx,cy). Used for Voronoi dual.
function circumcenter(
    ax: number, ay: number,
    bx: number, by: number,
    cx: number, cy: number,
): Pt {
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-12) return { x: (ax + bx + cx) / 3, y: (ay + by + cy) / 3 };
    const a2 = ax * ax + ay * ay;
    const b2 = bx * bx + by * by;
    const c2 = cx * cx + cy * cy;
    return {
        x: (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d,
        y: (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d,
    };
}

// Precomputed Gaussian-blob texture for organic opacity mask.
function gaussian(x: number, y: number, cx: number, cy: number, sigma: number): number {
    const dx = x - cx, dy = y - cy;
    return Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
}

function generateTexture(w: number, h: number): Float32Array {
    const tex = new Float32Array(w * h);
    const blobs: { cx: number; cy: number; sigma: number }[] = [];
    for (let i = 0; i < NUM_BLOBS; i++) {
        blobs.push({
            cx: Math.random() * w,
            cy: Math.random() * h,
            sigma: 5 + Math.random() * 20,
        });
    }
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let sum = 0;
            for (const b of blobs) sum += gaussian(x, y, b.cx, b.cy, b.sigma);
            tex[y * w + x] = sum;
        }
    }
    // Normalise to [0, 1].
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < tex.length; i++) {
        if (tex[i] < min) min = tex[i];
        if (tex[i] > max) max = tex[i];
    }
    const range = max - min || 1;
    for (let i = 0; i < tex.length; i++) tex[i] = (tex[i] - min) / range;
    return tex;
}

// Bilinear sample from the precomputed texture.
function sampleTexture(tex: Float32Array, w: number, h: number, tx: number, ty: number): number {
    const x = Math.max(0, Math.min(w - 1.001, tx));
    const y = Math.max(0, Math.min(h - 1.001, ty));
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1);
    const fx = x - x0, fy = y - y0;
    const v00 = tex[y0 * w + x0], v10 = tex[y0 * w + x1];
    const v01 = tex[y1 * w + x0], v11 = tex[y1 * w + x1];
    return (v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy;
}

// Box-Muller: normal distribution (mean 0, stddev 1).
function gaussianRand(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export default function init(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext("2d")!;
    let cw = 0, ch = 0;
    let tex: Float32Array;
    let texW = 0, texH = 0;
    let pts: MovingPt[] = [];

    let repulsionRadius = 0, repulsionStrength = 0;
    let maxSpeed = 0, noise = 0;
    let particleRepulsion = 0, particleRepulsionCutoff = 0;
    let initSigma = 0;

    let mx = -100, my = -100;
    let mouseActive = false;
    let mouseDown = false;

    function resize(): void {
        const newW = canvas.clientWidth;
        const newH = canvas.clientHeight;
        if (canvas.width !== newW || canvas.height !== newH) {
            canvas.width = newW;
            canvas.height = newH;
        }
        if (cw === newW && ch === newH) return;
        const firstInit = cw === 0;
        cw = newW;
        ch = newH;

        const minDim = Math.min(cw, ch);
        const scale = minDim / 120;

        repulsionRadius = 35 * scale;
        repulsionStrength = 1.2 * scale;
        maxSpeed = 0.9 * scale;
        noise = 0.04 * scale;
        particleRepulsion = 0.35 * scale;
        particleRepulsionCutoff = 28 * scale;
        initSigma = 6 * scale;

        if (firstInit) {
            texW = Math.min(320, Math.floor(cw / 3)) || 80;
            texH = Math.min(180, Math.floor(ch / 3)) || 45;
            tex = generateTexture(texW, texH);

            const numPoints = Math.max(20, Math.floor(Math.sqrt(cw * ch) * 0.12));
            const cx = cw / 2, cy = ch / 2;
            pts = [];
            for (let i = 0; i < numPoints; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = (0.15 + Math.random() * 0.75) * scale;
                pts.push({
                    x: cx + gaussianRand() * initSigma,
                    y: cy + gaussianRand() * initSigma,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                });
            }
        }
    }

    function updatePoints(): void {
        for (let i = 0; i < pts.length; i++) {
            for (let j = i + 1; j < pts.length; j++) {
                const dx = pts[i].x - pts[j].x;
                const dy = pts[i].y - pts[j].y;
                const dist = Math.hypot(dx, dy);
                if (dist < particleRepulsionCutoff && dist > 0.5) {
                    const force = particleRepulsion / (dist * dist);
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    pts[i].vx += fx;
                    pts[i].vy += fy;
                    pts[j].vx -= fx;
                    pts[j].vy -= fy;
                }
            }
        }

        for (const p of pts) {
            if (mouseActive) {
                const dx = p.x - mx, dy = p.y - my;
                const dist = Math.hypot(dx, dy);
                if (dist < repulsionRadius && dist > 0.01) {
                    const force = (1 - dist / repulsionRadius) * repulsionStrength;
                    const sign = mouseDown ? 1 : -1;
                    p.vx += (dx / dist) * force * sign;
                    p.vy += (dy / dist) * force * sign;
                }
            }
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 1) { p.x = 1; p.vx *= -DAMPING; }
            if (p.x > cw - 1) { p.x = cw - 1; p.vx *= -DAMPING; }
            if (p.y < 1) { p.y = 1; p.vy *= -DAMPING; }
            if (p.y > ch - 1) { p.y = ch - 1; p.vy *= -DAMPING; }
            p.vx += (Math.random() - 0.5) * noise;
            p.vy += (Math.random() - 0.5) * noise;
            const spd = Math.hypot(p.vx, p.vy);
            if (spd > maxSpeed) {
                p.vx = (p.vx / spd) * maxSpeed;
                p.vy = (p.vy / spd) * maxSpeed;
            }
        }
    }

    function render(): void {
        resize();
        const time = performance.now();

        ctx.fillStyle = "rgba(9, 14, 19, 0.08)";
        ctx.fillRect(0, 0, cw, ch);

        let massCx = 0, massCy = 0;
        for (const p of pts) { massCx += p.x; massCy += p.y; }
        massCx /= pts.length;
        massCy /= pts.length;
        const grad = ctx.createRadialGradient(
            massCx, massCy, Math.min(cw, ch) * 0.05,
            massCx, massCy, Math.max(cw, ch) * 0.75,
        );
        grad.addColorStop(0, "rgba(9, 14, 19, 0)");
        grad.addColorStop(0.55, "rgba(9, 14, 19, 0)");
        grad.addColorStop(1, "rgba(9, 14, 19, 0.5)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cw, ch);

        const tris = triangulate(pts);
        const txScale = texW / cw;
        const tyScale = texH / ch;
        const posFreq = 9.6 / cw;
        const baseHue = (time * 0.008) % 360;

        for (const tri of tris) {
            const [ai, bi, ci] = tri;
            const cx = (pts[ai].x + pts[bi].x + pts[ci].x) / 3;
            const cy = (pts[ai].y + pts[bi].y + pts[ci].y) / 3;
            const lum = sampleTexture(tex, texW, texH, cx * txScale, cy * tyScale);
            if (lum < LUMINANCE_THRESHOLD) continue;

            const pulse = 0.68 + 0.32 * Math.sin(time * 0.0008 + cx * posFreq);
            const hue = (baseHue + 230 + (20 - 230) * lum) % 360;
            const alpha = lum * pulse;

            ctx.beginPath();
            ctx.moveTo(pts[ai].x, pts[ai].y);
            ctx.lineTo(pts[bi].x, pts[bi].y);
            ctx.lineTo(pts[ci].x, pts[ci].y);
            ctx.closePath();

            ctx.shadowColor = "hsla(" + hue + ", 70%, 50%, " + (alpha * 0.45).toFixed(3) + ")";
            ctx.shadowBlur = 4 + lum * 11;
            ctx.fillStyle = "hsla(" + hue + ", 55%, 68%, " + alpha.toFixed(3) + ")";
            ctx.fill();
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
        }

        if (mouseActive) {
            for (let i = 3; i >= 0; i--) {
                ctx.beginPath();
                ctx.arc(mx, my, 12 + i * 18, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(249, 249, 249, " + (0.028 - i * 0.006).toFixed(3) + ")";
                ctx.fill();
            }
        }
    }

    canvas.addEventListener("mousemove", (e: MouseEvent) => {
        const r = canvas.getBoundingClientRect();
        mx = e.clientX - r.left;
        my = e.clientY - r.top;
        mouseActive = true;
    });
    canvas.addEventListener("mouseleave", () => { mouseActive = false; });
    canvas.addEventListener("mouseenter", (e: MouseEvent) => {
        const r = canvas.getBoundingClientRect();
        mx = e.clientX - r.left;
        my = e.clientY - r.top;
        mouseActive = true;
    });
    canvas.addEventListener("mousedown", () => { mouseDown = true; });
    canvas.addEventListener("mouseup", () => { mouseDown = false; });

    function tick(): void {
        updatePoints();
        render();
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}
