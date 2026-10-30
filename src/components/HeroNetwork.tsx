"use client";

import { useEffect, useRef } from "react";
import { GLOW } from "@/lib/fields";

type N = { x: number; y: number; r: number; c: string; vx: number; vy: number; born: number };

// The landing page's one moment of motion: threads grow out from a central spore
// and connect people, then the network breathes slowly.
export default function HeroNetwork() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0,
      h = 0,
      raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let nodes: N[] = [];
    let edges: [number, number, number][] = [];

    const seed = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cx = w * (w > 900 ? 0.68 : 0.5);
      const cy = h * 0.5;
      const count = w > 900 ? 70 : 40;
      nodes = [{ x: cx, y: cy, r: 7, c: "#F2C46D", vx: 0, vy: 0, born: 0 }];
      for (let i = 1; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 60 + Math.pow(Math.random(), 0.7) * Math.min(w, h) * 0.75;
        nodes.push({
          x: cx + Math.cos(a) * d * (w > 900 ? 1.15 : 0.9),
          y: cy + Math.sin(a) * d * 0.75,
          r: 1.6 + Math.random() * 2.8,
          c: GLOW[i % 5],
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.08,
          born: d / 260,
        });
      }
      edges = [];
      for (let i = 1; i < nodes.length; i++) {
        // connect to the nearest node that's closer to the centre: grows like hyphae
        let best = 0,
          bd = Infinity;
        for (let j = 0; j < nodes.length; j++) {
          if (j === i || nodes[j].born >= nodes[i].born) continue;
          const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (d < bd) (bd = d), (best = j);
        }
        edges.push([best, i, nodes[i].born]);
        if (Math.random() < 0.25) {
          const k = 1 + Math.floor(Math.random() * (nodes.length - 1));
          if (k !== i && Math.hypot(nodes[i].x - nodes[k].x, nodes[i].y - nodes[k].y) < 160)
            edges.push([i, k, Math.max(nodes[i].born, nodes[k].born) + 0.4]);
        }
      }
    };

    const start = performance.now();
    const draw = (now: number) => {
      const t = reduce ? 99 : (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        if (!reduce) {
          n.x += n.vx;
          n.y += n.vy;
        }
      }
      ctx.lineCap = "round";
      for (const [a, b, born] of edges) {
        const p = Math.min(1, Math.max(0, (t - born) / 0.9));
        if (p <= 0) continue;
        const A = nodes[a],
          B = nodes[b];
        const mx = (A.x + B.x) / 2 + (B.y - A.y) * 0.12;
        const my = (A.y + B.y) / 2 - (B.x - A.x) * 0.12;
        ctx.strokeStyle = `rgba(127,214,232,${0.18 * p})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        // partial quadratic curve for the growing effect
        const steps = 16;
        for (let s = 1; s <= steps * p; s++) {
          const u = s / steps;
          const x = (1 - u) * (1 - u) * A.x + 2 * (1 - u) * u * mx + u * u * B.x;
          const y = (1 - u) * (1 - u) * A.y + 2 * (1 - u) * u * my + u * u * B.y;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      for (const n of nodes) {
        const p = Math.min(1, Math.max(0, (t - n.born) / 0.6));
        if (p <= 0) continue;
        const pulse = 1 + Math.sin(t * 1.3 + n.x) * 0.15;
        ctx.globalAlpha = p;
        ctx.shadowColor = n.c;
        ctx.shadowBlur = n.r * 5;
        ctx.fillStyle = n.c;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    seed();
    raf = requestAnimationFrame(draw);
    const onResize = () => {
      seed();
      if (reduce) draw(0);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}
