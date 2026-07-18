const MAX_DISTANCE = 110;
const MOUSE_RADIUS = 180;
const MAGNET_STRENGTH = 0.4;
const FRICTION = 0.98;
const BASE_SPEED = 0.8;
const MAX_RADIUS = 2.5;
const MIN_RADIUS = 1.5;
const NOISE_STRENGTH = 0.05;
const LINE_ALPHA_MAX = 0.5;
const LINE_WIDTH = 1.0;

interface ParticleState {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    hue: number;
    brightness: number;
    twinklePhase: number;
}

interface MouseState {
    x: number | null;
    y: number | null;
    active: boolean;
}

export default function init(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext("2d")!;
    let w = 0;
    let h = 0;

    const mouse: MouseState = { x: null, y: null, active: false };
    const particles: ParticleState[] = [];

    function resize(): void {
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        if (canvas.width !== cw || canvas.height !== ch) {
            canvas.width = cw;
            canvas.height = ch;
            w = cw;
            h = ch;
        }
    }

    function createParticle(): ParticleState {
        const radius = Math.random() * MAX_RADIUS + MIN_RADIUS;
        const t = (radius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS);
        return {
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * BASE_SPEED,
            vy: (Math.random() - 0.5) * BASE_SPEED,
            radius: radius,
            hue: t < 0.5 ? 10 + t * 40 : 205 + t * 25,
            brightness: 0.4 + Math.random() * 0.6,
            twinklePhase: Math.random() * Math.PI * 2,
        };
    }

    function updateParticle(p: ParticleState): void {
        // Friction
        p.vx *= FRICTION;
        p.vy *= FRICTION;

        // Random perturbation (simulates Brownian noise)
        p.vx += (Math.random() - 0.5) * NOISE_STRENGTH;
        p.vy += (Math.random() - 0.5) * NOISE_STRENGTH;

        // Magnetic attraction toward mouse
        if (mouse.active && mouse.x !== null && mouse.y !== null) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.hypot(dx, dy);

            if (dist < MOUSE_RADIUS && dist > 0) {
                const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
                p.vx += (dx / dist) * force * MAGNET_STRENGTH;
                p.vy += (dy / dist) * force * MAGNET_STRENGTH;
            }
        }

        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges and clamp
        if (p.x < 0) {
            p.x = 0;
            p.vx *= -1;
        } else if (p.x > w) {
            p.x = w;
            p.vx *= -1;
        }

        if (p.y < 0) {
            p.y = 0;
            p.vy *= -1;
        } else if (p.y > h) {
            p.y = h;
            p.vy *= -1;
        }
    }

    function drawParticle(p: ParticleState, time: number): void {
        const twinkle = 0.7 + 0.3 * Math.sin(time * 0.003 + p.twinklePhase);
        const alpha = p.brightness * twinkle * 0.5;
        const r = p.radius;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 5, 0, Math.PI * 2);
        ctx.fillStyle = "hsla(" + p.hue + ", 90%, 55%, " + alpha * 0.08 + ")";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "hsla(" + p.hue + ", 85%, 65%, " + alpha * 0.15 + ")";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, " + Math.min(1, alpha * 1.4) + ")";
        ctx.fill();
    }

    function drawEdges(): void {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.hypot(dx, dy);

                if (dist < MAX_DISTANCE) {
                    const alpha = (1 - dist / MAX_DISTANCE) * LINE_ALPHA_MAX;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = "rgba(128, 128, 128, " + alpha + ")";
                    ctx.lineWidth = LINE_WIDTH;
                    ctx.stroke();
                }
            }
        }
    }

    resize();

    for (let i = 0; i < Math.floor(0.25 * Math.sqrt(w * h)); i++) {
        particles.push(createParticle());
    }

    function onMouseMove(clientX: number, clientY: number): void {
        const rect = canvas.getBoundingClientRect();
        mouse.x = clientX - rect.left;
        mouse.y = clientY - rect.top;
        mouse.active = true;
    }

    function onMouseLeave(): void {
        mouse.x = null;
        mouse.y = null;
        mouse.active = false;
    }

    canvas.addEventListener("mousemove", (e: MouseEvent) => {
        onMouseMove(e.clientX, e.clientY);
    });

    canvas.addEventListener("mouseleave", onMouseLeave);

    canvas.addEventListener("touchmove", (e: TouchEvent) => {
        if (e.touches.length > 0) {
            onMouseMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    canvas.addEventListener("touchend", onMouseLeave);

    function tick(): void {
        resize();

        ctx.clearRect(0, 0, w, h);

        for (const p of particles) updateParticle(p);
        drawEdges();

        const time = performance.now();
        for (const p of particles) drawParticle(p, time);

        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}
