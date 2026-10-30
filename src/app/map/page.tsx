"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileUp, PanelRightClose, PanelRightOpen, Search, Sparkles, UserPlus, Users } from "lucide-react";
import Nav from "@/components/Nav";
import AddModal, { type AddMode } from "@/components/AddModal";
import InsightsPanel from "@/components/InsightsPanel";
import PersonPanel from "@/components/PersonPanel";
import type { GNode, GLink } from "@/components/GraphView";
import { useMe } from "@/app/providers";
import { analyze } from "@/lib/analysis";
import { colorFor, YOU_COLOR } from "@/lib/fields";
import { download, exportCsv } from "@/lib/csv";
import type { Insight, Link, Person } from "@/lib/types";

const GraphView = dynamic(() => import("@/components/GraphView"), { ssr: false });

const byFrequency = (values: string[]) => {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
};

export default function MapPage() {
  const { me, refreshMe } = useMe();
  const [people, setPeople] = useState<Person[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [members, setMembers] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [tab, setTab] = useState<"insights" | "people">("insights");
  const [colorBy, setColorBy] = useState<"circle" | "field">("circle");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<AddMode | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [msg, setMsg] = useState("");
  const [fitKey, setFitKey] = useState(0);

  const toast = useCallback((s: string) => {
    setMsg(s);
    setTimeout(() => setMsg((m) => (m === s ? "" : m)), 3500);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/people");
    if (!res.ok) return;
    const j = await res.json();
    setPeople(j.people);
    setLinks(j.links);
    setMembers(new Set(j.memberEmails));
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
    if (window.innerWidth < 768) setPanelOpen(false);
  }, [load]);

  const circles = useMemo(() => byFrequency(people.map((p) => p.circle)), [people]);
  const fields = useMemo(() => byFrequency(people.map((p) => p.field)), [people]);
  const keys = colorBy === "circle" ? circles : fields;
  const report = useMemo(() => analyze(people, links), [people, links]);

  const nodes: GNode[] = useMemo(
    () => [
      { id: "me", label: me?.name?.split(" ")[0] || "You", color: YOU_COLOR, size: 7, kind: "you", fx: 0, fy: 0 },
      ...people.map((p) => ({
        id: p._id,
        label: p.name,
        color: colorFor(colorBy === "circle" ? p.circle : p.field, keys),
        size: 2.4 + p.closeness * 0.85,
        kind: "person" as const,
      })),
    ],
    [people, colorBy, keys, me?.name]
  );
  const glinks: GLink[] = useMemo(
    () => [
      ...people.map((p) => ({ source: "me", target: p._id, kind: "ego" as const, weight: p.closeness })),
      ...links.map((l) => ({ source: l.a, target: l.b, kind: "link" as const })),
    ],
    [people, links]
  );

  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return new Set(
      people
        .filter((p) => [p.name, p.circle, p.field, p.role, p.org, p.city, p.country, ...p.tags].join(" ").toLowerCase().includes(q))
        .map((p) => p._id)
    );
  }, [query, people]);
  const highlight = searchHits ?? (insight ? new Set(insight.nodeIds) : null);
  const person = people.find((p) => p._id === selected) || null;

  const select = (id: string | null) => {
    if (id === "me") id = null;
    setSelected(id);
    if (id) setPanelOpen(true);
  };

  const empty = loaded && people.length === 0;

  return (
    <main className="relative h-[100dvh] overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(900px 700px at 50% 45%, rgba(40,52,110,0.35), transparent 70%)" }}
      />
      {!empty && (
        <GraphView nodes={nodes} links={glinks} highlight={highlight} selected={selected} onSelect={select} fitKey={fitKey} insetX={panelOpen ? 400 : 0} />
      )}
      <Nav floating />

      {/* Toolbar */}
      {!empty && (
        <div className="absolute top-[4.6rem] left-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2">
          <button className="btn btn-spore" onClick={() => setAdding("one")}>
            <UserPlus size={15} /> Add person
          </button>
          <div className="panel flex items-center gap-0.5 !rounded-full p-1">
            <button className="btn btn-quiet" onClick={() => setAdding("quick")} title="Add a group">
              <Users size={15} /> <span className="hidden sm:inline">Group</span>
            </button>
            <button className="btn btn-quiet" onClick={() => setAdding("describe")} title="Describe people in your own words">
              <Sparkles size={15} /> <span className="hidden sm:inline">Describe</span>
            </button>
            <button className="btn btn-quiet" onClick={() => setAdding("import")} title="Import a file">
              <FileUp size={15} /> <span className="hidden sm:inline">Import</span>
            </button>
            <button
              className="btn btn-quiet"
              onClick={() => download("my-mycelium-map.csv", exportCsv(people, links))}
              title="Download your map as CSV"
              aria-label="Download your map"
            >
              <Download size={15} />
            </button>
          </div>
          <label className="panel flex items-center gap-2 !rounded-full px-3 py-1.5">
            <Search size={15} className="text-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a person, place, interest"
              className="w-44 bg-transparent text-sm outline-none placeholder:text-dim sm:w-56"
              aria-label="Search your map"
            />
          </label>
        </div>
      )}

      {/* Legend */}
      {!empty && keys.length > 0 && (
        <div className="panel absolute bottom-3 left-3 z-20 hidden max-w-[min(560px,calc(100%-420px))] items-center gap-3 px-3 py-2 md:flex">
          <div className="flex shrink-0 rounded-full border border-white/10 p-0.5 text-xs">
            {(["circle", "field"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setColorBy(c)}
                className={`rounded-full px-2.5 py-1 ${colorBy === c ? "bg-white/12 text-star" : "text-mist"}`}
              >
                By {c}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-mist">
            {keys.slice(0, 10).map((k) => (
              <button key={k} className="flex items-center gap-1.5 hover:text-star" onClick={() => setQuery(k)}>
                <span className="h-2 w-2 rounded-full" style={{ background: colorFor(k, keys), boxShadow: `0 0 6px ${colorFor(k, keys)}` }} />
                {k}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Side panel */}
      {!empty && (
        <>
          <button
            className="panel absolute right-3 bottom-3 z-30 !rounded-full p-2.5 md:hidden"
            onClick={() => setPanelOpen((o) => !o)}
            aria-label={panelOpen ? "Hide panel" : "Show panel"}
          >
            {panelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>
          <aside
            className={`panel scroll-thin absolute z-20 overflow-y-auto p-5 transition-transform ${
              panelOpen ? "" : "max-md:translate-y-[110%]"
            } right-3 left-3 bottom-16 max-h-[52vh] md:top-[4.6rem] md:bottom-3 md:left-auto md:max-h-none md:w-[390px]`}
          >
            {person ? (
              <PersonPanel
                person={person}
                people={people}
                links={links}
                circles={circles}
                isMember={Boolean(person.email && members.has(person.email))}
                onBack={() => setSelected(null)}
                onChanged={load}
                onSelect={select}
                toast={toast}
              />
            ) : (
              <>
                <div className="mb-4 flex gap-1 rounded-full border border-white/10 p-1 text-sm">
                  {(["insights", "people"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`flex-1 rounded-full px-3 py-1.5 ${tab === t ? "bg-white/12 text-star" : "text-mist hover:text-star"}`}
                    >
                      {t === "insights" ? "Network health" : `People (${people.length})`}
                    </button>
                  ))}
                </div>
                {tab === "insights" ? (
                  <InsightsPanel report={report} activeId={insight?.id || null} onPick={(i) => (setInsight(i), setQuery(""))} />
                ) : (
                  <ul className="divide-y divide-white/6">
                    {people
                      .filter((p) => !searchHits || searchHits.has(p._id))
                      .sort((a, b) => b.closeness - a.closeness || a.name.localeCompare(b.name))
                      .map((p) => (
                        <li key={p._id}>
                          <button className="flex w-full items-center gap-3 py-2 text-left hover:text-spore" onClick={() => select(p._id)}>
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: colorFor(colorBy === "circle" ? p.circle : p.field, keys) }}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate">{p.name}</span>
                              <span className="block truncate text-xs text-dim">{[p.circle, p.role, p.city].filter(Boolean).join(", ")}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </>
            )}
          </aside>
        </>
      )}

      {/* Empty state */}
      {empty && (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-4 pt-20">
          <div className="max-w-2xl">
            <h1 className="display text-4xl font-light sm:text-5xl">Start your map</h1>
            <p className="mt-3 max-w-[52ch] text-mist">
              Begin with the people you&apos;d call if you needed help. You can add more, and connect who knows whom, whenever
              you like.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { m: "describe" as const, t: "Describe them", d: "Write about people in your own words. The AI finds names, circles and who knows whom.", i: <Sparkles size={18} /> },
                { m: "import" as const, t: "Import a file", d: "Use the Mycelium template or your LinkedIn Connections.csv.", i: <FileUp size={18} /> },
                { m: "quick" as const, t: "Add a group", d: "Paste a list of names from one circle, like your class or team.", i: <Users size={18} /> },
                { m: "one" as const, t: "Add one person", d: "Fill in a single card with as much detail as you like.", i: <UserPlus size={18} /> },
              ].map((o) => (
                <button key={o.m} onClick={() => setAdding(o.m)} className="panel p-5 text-left transition-colors hover:border-spore/50">
                  <span className="text-spore">{o.i}</span>
                  <span className="display mt-2 block text-xl">{o.t}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-mist">{o.d}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {adding && (
        <AddModal
          initial={adding}
          circles={circles}
          existingNames={people.map((p) => p.name)}
          aiEnabled={Boolean(me?.aiEnabled)}
          onClose={() => setAdding(null)}
          onDone={async (m) => {
            setAdding(null);
            toast(m);
            await load();
            setFitKey((k) => k + 1);
            refreshMe();
          }}
        />
      )}

      {msg && (
        <div role="status" className="panel absolute bottom-20 left-1/2 z-50 -translate-x-1/2 px-4 py-2 text-sm md:bottom-6">
          {msg}
        </div>
      )}
    </main>
  );
}
