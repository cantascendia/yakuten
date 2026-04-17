/**
 * ParticleCanvas — Penacony "Particle Scrim" animated layer (DESIGN.md §5)
 *
 * Small Canvas 2D layer with 50 drifting particles in primary/accent colors
 * at 5-10% opacity. Sits behind all UI content, above the CSS orbs/dots.
 *
 * - Loaded with client:idle (never blocks first interaction).
 * - Respects prefers-reduced-motion: renders a single static frame, no RAF loop.
 * - Pauses when tab is hidden (visibilitychange).
 * - Device-pixel-ratio aware for retina crispness.
 * - pointer-events: none — never intercepts clicks/touches.
 *
 * If this island never hydrates (no JS / SSR-only viewer), nothing renders
 * visible — the CSS ParticleBackground already provides a fallback scrim.
 */
import { useEffect, useRef } from 'react';

const PARTICLE_COUNT = 50;
const COLORS = [
  'rgba(200, 75, 124, 0.10)', // primary (crimson)
  'rgba(212, 168, 83, 0.08)', // accent (gold)
  'rgba(200, 75, 124, 0.06)', // primary (dim)
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
}

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let rafId = 0;
    let visible = true;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    const seed = () => {
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 1 + Math.random() * 2.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        // wrap edges
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;
      }
      draw();
      if (visible) rafId = requestAnimationFrame(step);
    };

    const onVisibility = () => {
      visible = !document.hidden;
      if (visible && !prefersReducedMotion) {
        rafId = requestAnimationFrame(step);
      } else {
        cancelAnimationFrame(rafId);
      }
    };

    resize();
    seed();
    draw();

    if (!prefersReducedMotion) {
      rafId = requestAnimationFrame(step);
      document.addEventListener('visibilitychange', onVisibility);
    }
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1, // above ParticleBackground (z:0), below content (z:10)
      }}
    />
  );
}
