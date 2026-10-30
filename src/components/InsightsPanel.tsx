"use client";

import type { HealthReport } from "@/lib/analysis";
import type { Insight } from "@/lib/types";

const KIND: Record<Insight["kind"], { heading: string; color: string }> = {
  strength: { heading: "Strengths", color: "#A8E39A" },
  watch: { heading: "Worth a look", color: "#F29BB2" },
  idea: { heading: "Introductions you could make", color: "#F2C46D" },
};

export default function InsightsPanel({
  report,
  activeId,
  onPick,
}: {
  report: HealthReport;
  activeId: string | null;
  onPick: (i: Insight | null) => void;
}) {
  const s = report.stats;
  const stats = [
    { n: s.people, l: s.people === 1 ? "person" : "people" },
    { n: s.links, l: s.links === 1 ? "connection" : "connections" },
    { n: s.inner, l: "close ties" },
    { n: s.countries, l: s.countries === 1 ? "country" : "countries" },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-2">
        {stats.map((x) => (
          <div key={x.l} className="text-center">
            <div className="display text-2xl">{x.n}</div>
            <div className="text-[11px] leading-tight text-dim">{x.l}</div>
          </div>
        ))}
      </div>
      {report.insights.length === 0 && (
        <p className="text-sm leading-relaxed text-mist">
          Insights appear once your map has a few people and some connections between them. Open a person and use
          &ldquo;Who do they know?&rdquo; to connect friends who know each other.
        </p>
      )}
      {(["watch", "strength", "idea"] as const).map((k) => {
        const items = report.insights.filter((i) => i.kind === k);
        if (!items.length) return null;
        return (
          <section key={k}>
            <h3 className="mb-2 flex items-center gap-2 text-sm text-mist">
              <span className="h-2 w-2 rounded-full" style={{ background: KIND[k].color, boxShadow: `0 0 8px ${KIND[k].color}` }} />
              {KIND[k].heading}
            </h3>
            <ul className="space-y-2">
              {items.map((i) => {
                const active = activeId === i.id;
                return (
                  <li key={i.id}>
                    <button
                      onClick={() => onPick(active ? null : i)}
                      disabled={!i.nodeIds.length}
                      className={`w-full rounded-xl border px-3.5 py-3 text-left transition-colors ${
                        active ? "border-spore/60 bg-spore/8" : "border-white/8 hover:border-white/20 disabled:hover:border-white/8"
                      }`}
                    >
                      <div className="font-medium leading-snug">{i.title}</div>
                      <p className="mt-1 text-sm leading-relaxed text-mist">{i.detail}</p>
                      {i.nodeIds.length > 0 && (
                        <span className="mt-1.5 block text-xs text-dim">{active ? "Showing on the map. Click again to clear." : "Show on the map"}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
