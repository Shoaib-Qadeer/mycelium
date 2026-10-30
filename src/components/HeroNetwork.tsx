"use client";

import { useEffect, useRef } from "react";
import { GLOW } from "@/lib/fields";

type N = { x: number; y: number; r: number; c: string; vx: number; vy: number; born: number; parent: number; depth: number; phase: number };

const PEOPLE = [
  "Policy officer, Geneva",
  "Climate researcher, Stockholm",
  "Founder, Lahore",
  "Teacher, Paris",
  "Designer, Berlin",
  "Engineer, Nairobi",
  "Data scientist, Montréal",
  "Journalist, Lisbon",
  "Doctor, Islamabad",
  "Curator, Mexico City",
];

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/**
 * The landing hero: threads grow out from you, nutrients flow along them, and every few
 * seconds a warm path lights up from you to someone you could meet through a friend.
 */
export default function HeroNetwork() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0,
      h = 0,
      cx = 0,
      cy = 0,
      raf = 0;
    let nodes: N[] = [];
    let extra: [number, number, number][] = [];
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let font = "sans-serif";
    let theme = { light: false, label: "#eef0ff", pill: "rgba(14,20,48,0.85)", link: "127,214,232", gold: "242,196,109" };

    const readTheme = () => {
      const light = document.documentElement.getAttribute("data-theme") === "light";
      theme = light
        ? { light, label: "#161b3a", pill: "rgba(255,255,255,0.92)", link: "40,110,140", gold: "190,130,20" }
        : { light, label: "#eef0ff", pill: "rgba(14,20,48,0.85)", link: "127,214,232", gold: "242,196,109" };
      font = getComputedStyle(document.body).fontFamily || "sans-serif";
    };

    const seed = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w * (w > 900 ? 0.68 : 0.5);
      cy = h * (w > 900 ? 0.5 : 0.62);
      const count = w > 900 ? 78 : 44;
      nodes = [{ x: cx, y: cy, r: 7, c: "#F2C46D", vx: 0, vy: 0, born: 0, parent: -1, depth: 0, phase: 0 }];
      for (let i = 1; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 60 + Math.pow(Math.random(), 0.7) * Math.min(w, h) * 0.75;
        nodes.push({
          x: cx + Math.cos(a) * d * (w > 900 ? 1.15 : 0.9),
          y: cy + Math.sin(a) * d * 0.75,
          r: 1.6 + Math.random() * 2.8,
          c: GLOW[i % 6],
          vx: (Math.random() - 0.5) * 0.07,
          vy: (Math.random() - 0.5) * 0.07,
          born: d / 260,
          parent: 0,
          depth: 1,
          phase: Math.random(),
        });
      }
      // Each node hangs off its nearest node closer to the centre: grows like hyphae.
      for (let i = 1; i < nodes.length; i++) {
        let best = 0,
          bd = Infinity;
        for (let j = 0; j < nodes.length; j++) {
          if (j === i || nodes[j].born >= nodes[i].born) continue;
          const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (d < bd) (bd = d), (best = j);
        }
        nodes[i].parent = best;
      }
      const order = nodes.map((_, i) => i).sort((a, b) => nodes[a].born - nodes[b].born);
      for (const i of order) if (i) nodes[i].depth = nodes[nodes[i].parent].depth + 1;
      extra = [];
      for (let i = 1; i < nodes.length; i++) {
        if (Math.random() < 0.22) {
          const k = 1 + Math.floor(Math.random() * (nodes.length - 1));
          if (k !== i && Math.hypot(nodes[i].x - nodes[k].x, nodes[i].y - nodes[k].y) < 150) extra.push([i, k, Math.max(nodes[i].born, nodes[k].born) + 0.4]);
        }
      }
    };

    // Position with a gentle parallax: deeper nodes drift more as the pointer moves.
    const pos = (n: N) => ({ x: n.x + mouse.x * n.depth * 4, y: n.y + mouse.y * n.depth * 3 });
    const curvePoint = (A: { x: number; y: number }, B: { x: number; y: number }, u: number) => {
      const mx = (A.x + B.x) / 2 + (B.y - A.y) * 0.12;
      const my = (A.y + B.y) / 2 - (B.x - A.x) * 0.12;
      return {
        x: (1 - u) * (1 - u) * A.x + 2 * (1 - u) * u * mx + u * u * B.x,
        y: (1 - u) * (1 - u) * A.y + 2 * (1 - u) * u * my + u * u * B.y,
      };
    };
    const strokeCurve = (A: { x: number; y: number }, B: { x: number; y: number }, p: number) => {
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      const steps = 16;
      for (let s = 1; s <= steps * p; s++) {
        const q = curvePoint(A, B, s / steps);
        ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
    };

    // The warm-path moment.
    let path: number[] = [];
    let pathStart = -10;
    let label = "";
    let steps = 0;
    const pickPath = (t: number) => {
      const candidates = nodes.map((n, i) => i).filter((i) => nodes[i].depth >= 2 && nodes[i].depth <= 4);
      if (!candidates.length) return;
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      const p: number[] = [];
      for (let v = target; v !== -1; v = nodes[v].parent) p.unshift(v);
      path = p;
      pathStart = t;
      steps = p.length - 1;
      label = PEOPLE[Math.floor(Math.random() * PEOPLE.length)];
    };

    const start = performance.now();
    let nextPath = 3.2;
    const draw = (now: number) => {
      const t = reduce ? 99 : (now - start) / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      ctx.clearRect(0, 0, w, h);
      if (!reduce) for (const n of nodes) (n.x += n.vx), (n.y += n.vy);
      ctx.lineCap = "round";

      const linkA = theme.light ? 0.3 : 0.18;
      for (let i = 1; i < nodes.length; i++) {
        const n = nodes[i];
        const p = Math.min(1, Math.max(0, (t - n.born) / 0.9));
        if (p <= 0) continue;
        ctx.strokeStyle = `rgba(${theme.link},${linkA * p})`;
        ctx.lineWidth = 1;
        strokeCurve(pos(nodes[n.parent]), pos(n), p);
      }
      for (const [a, b, born] of extra) {
        const p = Math.min(1, Math.max(0, (t - born) / 0.9));
        if (p <= 0) continue;
        ctx.strokeStyle = `rgba(${theme.link},${linkA * 0.7 * p})`;
        strokeCurve(pos(nodes[a]), pos(nodes[b]), p);
      }

      // Nutrients flowing outward along the threads.
      if (!reduce && t > 1.5) {
        for (let i = 1; i < nodes.length; i++) {
          const n = nodes[i];
          const u = (t * 0.35 + n.phase) % 1;
          const q = curvePoint(pos(nodes[n.parent]), pos(n), u);
          ctx.fillStyle = `rgba(${theme.link},${0.55 * Math.sin(u * Math.PI)})`;
          ctx.beginPath();
          ctx.arc(q.x, q.y, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Warm path: gold light travels from you to someone two or three steps away.
      if (!reduce && t > nextPath) {
        pickPath(t);
        nextPath = t + 4.6;
      }
      const age = t - pathStart;
      if (path.length > 1 && age < 4.2) {
        const fade = age < 3.4 ? 1 : 1 - (age - 3.4) / 0.8;
        const segDur = 0.45;
        ctx.lineWidth = 2;
        ctx.shadowColor = `rgba(${theme.gold},0.9)`;
        ctx.shadowBlur = 10;
        for (let s = 0; s < path.length - 1; s++) {
          const p = ease((age - s * segDur) / segDur);
          if (p <= 0) break;
          ctx.strokeStyle = `rgba(${theme.gold},${0.95 * fade})`;
          strokeCurve(pos(nodes[path[s]]), pos(nodes[path[s + 1]]), p);
        }
        ctx.shadowBlur = 0;
        const arrived = age - (path.length - 1) * segDur;
        if (arrived > 0) {
          const target = pos(nodes[path[path.length - 1]]);
          const a = Math.min(1, arrived / 0.35) * fade;
          // ring pulse on the person you could meet
          ctx.strokeStyle = `rgba(${theme.gold},${a * (1 - Math.min(1, arrived / 1.2))})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(target.x, target.y, 6 + arrived * 18, 0, Math.PI * 2);
          ctx.stroke();
          // label card
          const line1 = label;
          const line2 = `${steps} ${steps === 1 ? "step" : "steps"} away, through a friend`;
          ctx.font = `600 13px ${font}`;
          const w1 = ctx.measureText(line1).width;
          ctx.font = `400 12px ${font}`;
          const w2 = ctx.measureText(line2).width;
          const bw = Math.max(w1, w2) + 24;
          let bx = target.x + 14;
          if (bx + bw > w - 10) bx = target.x - 14 - bw;
          const by = Math.min(Math.max(target.y - 26, 10), h - 60);
          ctx.globalAlpha = a;
          ctx.fillStyle = theme.pill;
          ctx.strokeStyle = `rgba(${theme.gold},0.6)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(bx, by - 6 * (1 - a), bw, 46, 12);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = theme.label;
          ctx.textBaseline = "top";
          ctx.font = `600 13px ${font}`;
          ctx.fillText(line1, bx + 12, by + 8 - 6 * (1 - a));
          ctx.fillStyle = `rgba(${theme.gold},1)`;
          ctx.font = `400 12px ${font}`;
          ctx.fillText(line2, bx + 12, by + 26 - 6 * (1 - a));
          ctx.globalAlpha = 1;
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const p = Math.min(1, Math.max(0, (t - n.born) / 0.6));
        if (p <= 0) continue;
        const P = pos(n);
        const onPath = path.includes(i) && age < 4.2;
        const pulse = 1 + Math.sin(t * 1.3 + n.x) * 0.15 + (onPath ? 0.35 : 0);
        ctx.globalAlpha = p;
        ctx.shadowColor = onPath ? `rgb(${theme.gold})` : n.c;
        ctx.shadowBlur = n.r * (onPath ? 8 : 5);
        ctx.fillStyle = onPath && i ? `rgb(${theme.gold})` : n.c;
        ctx.beginPath();
        ctx.arc(P.x, P.y, n.r * pulse, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    readTheme();
    seed();
    raf = requestAnimationFrame(draw);
    const onResize = () => {
      seed();
      if (reduce) draw(0);
    };
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const mo = new MutationObserver(() => {
      readTheme();
      if (reduce) draw(0);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}
