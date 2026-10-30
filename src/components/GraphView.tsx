"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { useCanvasColors } from "@/lib/theme";

export type GNode = {
  id: string;
  label: string;
  color: string;
  size: number;
  kind: "you" | "person" | "member";
  fx?: number;
  fy?: number;
};
export type GLink = { source: string; target: string; kind: "ego" | "link" | "knows" | "club"; weight?: number };

type SimNode = GNode & { x?: number; y?: number };
type SimLink = Omit<GLink, "source" | "target"> & { source: string | SimNode; target: string | SimNode };

function rgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const idOf = (v: string | SimNode) => (typeof v === "string" ? v : v.id);

export default function GraphView({
  nodes,
  links,
  highlight,
  selected,
  onSelect,
  fitKey,
  labelAll = false,
  insetX = 0,
}: {
  nodes: GNode[];
  links: GLink[];
  highlight?: Set<string> | null;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  fitKey?: string | number;
  labelAll?: boolean;
  /** Width of a panel covering the canvas: positive on the right, negative on the left. */
  insetX?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const fg = useRef<ForceGraphMethods<SimNode, SimLink> | undefined>(undefined);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const positions = useRef(new Map<string, { x: number; y: number }>());
  const fitted = useRef<string | number | undefined>(undefined);
  const font = useRef("sans-serif");
  const colors = useCanvasColors();
  const lk = (a: number) => `rgba(${colors.link},${Math.min(1, a * colors.linkStrength)})`;

  useEffect(() => {
    font.current = getComputedStyle(document.body).fontFamily || "sans-serif";
    const el = wrap.current!;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Keep positions across data changes so the map doesn't explode on every edit.
  const data = useMemo(() => {
    const ns: SimNode[] = nodes.map((n) => {
      const p = positions.current.get(n.id);
      return p ? { ...n, x: p.x, y: p.y } : { ...n };
    });
    return { nodes: ns, links: links.map((l) => ({ ...l })) as SimLink[] };
  }, [nodes, links]);

  useEffect(() => {
    const g = fg.current;
    if (!g) return;
    g.d3Force("charge")?.strength(-70);
    const link = g.d3Force("link") as unknown as {
      distance: (fn: (l: SimLink) => number) => { strength: (fn: (l: SimLink) => number) => void };
    } | undefined;
    link
      ?.distance((l) => (l.kind === "ego" ? 34 + (6 - (l.weight || 3)) * 20 : l.kind === "club" ? 150 : l.kind === "knows" ? 46 : 38))
      .strength((l) => (l.kind === "ego" ? 0.25 : l.kind === "club" ? 0.08 : 0.5));
    g.d3ReheatSimulation();
  }, [data]);

  const hi = highlight && highlight.size ? highlight : null;
  const hiLink = (l: SimLink) => {
    const a = idOf(l.source);
    const b = idOf(l.target);
    if (selected && (a === selected || b === selected)) return true;
    return Boolean(hi && hi.has(a) && hi.has(b));
  };

  return (
    <div ref={wrap} className="absolute inset-0">
      <ForceGraph2D<SimNode, SimLink>
        ref={fg}
        width={size.w}
        height={size.h}
        graphData={data}
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={180}
        d3VelocityDecay={0.32}
        onEngineTick={() => {
          for (const n of data.nodes) if (n.x !== undefined) positions.current.set(n.id, { x: n.x, y: n.y! });
        }}
        onEngineStop={() => {
          if (fitted.current !== fitKey) {
            fitted.current = fitKey;
            const g = fg.current;
            if (!g) return;
            const panel = size.w > 768 ? insetX : 0;
            g.zoomToFit(700, 90 + Math.abs(panel) / 2);
            if (panel)
              setTimeout(() => {
                const c = g.centerAt() as unknown as { x: number; y: number };
                g.centerAt(c.x + panel / 2 / g.zoom(), c.y, 400);
              }, 750);
          }
        }}
        linkCurvature={(l) => (l.kind === "ego" ? 0.06 : 0.22)}
        linkColor={(l) => {
          if (l.kind === "club") return "rgba(242,196,109,0.07)";
          if (hiLink(l)) return colors.light ? "rgba(190,130,20,0.85)" : "rgba(242,196,109,0.75)";
          if (hi || selected) return lk(0.05);
          return l.kind === "ego" ? lk(0.13) : l.kind === "knows" ? (colors.light ? "rgba(110,80,200,0.3)" : "rgba(185,166,255,0.22)") : lk(0.38);
        }}
        linkLineDash={(l) => (l.kind === "club" ? [2, 4] : null)}
        linkWidth={(l) => (l.kind === "club" ? 0.6 : hiLink(l) ? 1.6 : l.kind === "link" ? 1 : 0.6)}
        linkDirectionalParticles={(l) => (hiLink(l) ? 2 : 0)}
        linkDirectionalParticleWidth={2.2}
        linkDirectionalParticleColor={() => "#F2C46D"}
        linkDirectionalParticleSpeed={0.006}
        onNodeClick={(n) => onSelect?.(n.id)}
        onBackgroundClick={() => onSelect?.(null)}
        nodePointerAreaPaint={(n, color, ctx) => {
          if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) return;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, n.size + 3, 0, Math.PI * 2);
          ctx.fill();
        }}
        nodeCanvasObject={(n, ctx, scale) => {
          const x = n.x!,
            y = n.y!,
            r = n.size;
          if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r)) return;
          const lit = !hi || hi.has(n.id) || n.kind === "you" || n.id === selected;
          ctx.globalAlpha = lit ? 1 : 0.16;
          const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3.4);
          glow.addColorStop(0, rgba(n.color, n.kind === "you" ? 0.6 : 0.42));
          glow.addColorStop(1, rgba(n.color, 0));
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, r * 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = n.color;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          if (n.kind === "member") {
            ctx.strokeStyle = colors.label;
            ctx.lineWidth = 1 / scale;
            ctx.beginPath();
            ctx.arc(x, y, r + 2 / scale, 0, Math.PI * 2);
            ctx.stroke();
          }
          if (n.id === selected) {
            ctx.strokeStyle = colors.light ? "#a26d0c" : "#FFF3D1";
            ctx.lineWidth = 1.5 / scale;
            ctx.beginPath();
            ctx.arc(x, y, r + 4 / scale, 0, Math.PI * 2);
            ctx.stroke();
          }
          const showLabel =
            n.kind !== "person" || labelAll || scale > 1.7 || n.id === selected || (hi && hi.has(n.id) && hi.size <= 14);
          if (showLabel && n.label) {
            const fs = Math.max(11 / scale, 2.4);
            ctx.font = `${n.kind === "person" ? 500 : 650} ${fs}px ${font.current}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = n.kind === "you" ? colors.you : colors.label;
            ctx.shadowColor = colors.halo;
            ctx.shadowBlur = 4;
            ctx.fillText(n.label, x, y + r + 3 / scale);
            ctx.shadowBlur = 0;
          }
          ctx.globalAlpha = 1;
        }}
      />
    </div>
  );
}
