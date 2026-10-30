"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, Sparkles } from "lucide-react";
import Nav from "@/components/Nav";
import IntroModal from "@/components/IntroModal";
import type { GLink, GNode } from "@/components/GraphView";
import { useMe } from "@/app/providers";
import { shortestPath } from "@/lib/analysis";
import { FIELDS, GLOW, YOU_COLOR } from "@/lib/fields";
import type { BlindNode, ClubGraph } from "@/lib/types";

const GraphView = dynamic(() => import("@/components/GraphView"), { ssr: false });

const fieldColor = (f: string) => {
  const i = FIELDS.indexOf(f);
  return i < 0 || f === "Other" ? "#8E97C7" : GLOW[i % GLOW.length];
};

export default function ClubPage() {
  const { me } = useMe();
  const [g, setG] = useState<ClubGraph | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<{ matches: { id: string; reason: string }[]; mode: string } | null>(null);
  const [fieldFilter, setFieldFilter] = useState<string | null>(null);
  const [intro, setIntro] = useState<BlindNode | null>(null);
  const [msg, setMsg] = useState("");

  const toast = useCallback((s: string) => {
    setMsg(s);
    setTimeout(() => setMsg((m) => (m === s ? "" : m)), 3500);
  }, []);

  useEffect(() => {
    fetch("/api/club")
      .then((r) => r.json())
      .then(setG);
  }, []);

  const byId = useMemo(() => new Map((g?.nodes || []).map((n) => [n.id, n])), [g]);
  const memberIds = useMemo(() => (g?.nodes || []).filter((n) => n.type === "member").map((n) => n.id), [g]);
  // Everyone in the club knows each other through the club itself.
  const clubTies = useMemo(() => {
    if (!g) return [] as [string, string][];
    return memberIds.filter((m) => m !== g.me).map((m) => [g.me, m] as [string, string]);
  }, [g, memberIds]);

  const people = useMemo(() => (g?.nodes || []).filter((n) => n.type === "person"), [g]);

  const nodes: GNode[] = useMemo(
    () =>
      (g?.nodes || []).map((n) =>
        n.type === "member"
          ? {
              id: n.id,
              label: n.id === g!.me ? "You" : n.label.split(" ")[0],
              color: n.id === g!.me ? YOU_COLOR : "#EEF0FF",
              size: 6,
              kind: n.id === g!.me ? ("you" as const) : ("member" as const),
            }
          : {
              id: n.id,
              label: n.mine || n.label,
              color: fieldColor(n.field),
              size: 2.2 + Math.max(...n.knownBy.map((k) => k.closeness), 1) * 0.55 + (n.knownBy.length - 1) * 1.2,
              kind: "person" as const,
            }
      ),
    [g]
  );
  const links: GLink[] = useMemo(() => {
    const out: GLink[] = (g?.edges || []).map((e) => ({ source: e.source, target: e.target, kind: e.kind === "knows" ? ("knows" as const) : ("link" as const), weight: 3 }));
    // Faint ties between members keep the club's maps woven together on screen.
    for (let i = 0; i < memberIds.length; i++)
      for (let j = i + 1; j < memberIds.length; j++)
        if (memberIds.length <= 25 || i === 0) out.push({ source: memberIds[i], target: memberIds[j], kind: "club" });
    return out;
  }, [g, memberIds]);

  // Steps from you to everyone, treating club members as one step away.
  const steps = useMemo(() => {
    if (!g) return new Map<string, number>();
    const adj = new Map<string, string[]>();
    const add = (a: string, b: string) => {
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a)!.push(b);
      adj.get(b)!.push(a);
    };
    g.edges.forEach((e) => add(e.source, e.target));
    clubTies.forEach(([a, b]) => add(a, b));
    const dist = new Map<string, number>([[g.me, 0]]);
    const q = [g.me];
    while (q.length) {
      const v = q.shift()!;
      for (const w of adj.get(v) || []) if (!dist.has(w)) (dist.set(w, dist.get(v)! + 1), q.push(w));
    }
    return dist;
  }, [g, clubTies]);

  const fieldCounts = useMemo(() => {
    const m = new Map<string, number>(FIELDS.filter((f) => f !== "Other").map((f) => [f, 0]));
    for (const p of people) if (m.has(p.field)) m.set(p.field, m.get(p.field)! + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [people]);
  const countries = useMemo(() => new Set(people.map((p) => p.country.toLowerCase()).filter(Boolean)).size, [people]);
  const maxField = Math.max(1, ...fieldCounts.map(([, n]) => n));
  const blindSpots = fieldCounts.filter(([, n]) => n === 0).map(([f]) => f);

  const pathTo = (id: string) => (g ? shortestPath(g.me, id, g.edges, clubTies) : null);
  const nameOf = (id: string) => {
    const n = byId.get(id);
    if (!n) return "";
    if (id === g?.me) return "You";
    return n.type === "member" ? n.label : n.mine || n.label;
  };

  const highlight = useMemo(() => {
    if (selected) {
      const p = pathTo(selected);
      return p ? new Set(p) : new Set([selected]);
    }
    if (answer?.matches.length) return new Set(answer.matches.map((m) => m.id));
    if (fieldFilter) return new Set(people.filter((p) => p.field === fieldFilter).map((p) => p.id));
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, answer, fieldFilter, people, g]);

  const ask = async () => {
    setAsking(true);
    setSelected(null);
    setFieldFilter(null);
    const res = await fetch("/api/club/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const j = await res.json();
    setAsking(false);
    if (!res.ok) return toast(j.error || "Couldn't search right now.");
    setAnswer(j);
  };

  const sel = selected ? byId.get(selected) : null;
  const f = me?.features;

  if (f && !f.club)
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-xl px-5 pt-16">
          <h1 className="display text-4xl font-light">Club reach is switched off</h1>
          <p className="mt-3 text-mist">The admin has paused the shared club view for now. Your own map still works as usual.</p>
        </main>
      </div>
    );

  return (
    <main className="relative h-[100dvh] overflow-hidden">
      <div className="absolute inset-0" style={{ background: "radial-gradient(900px 700px at 60% 45%, rgba(60,46,120,0.32), transparent 70%)" }} />
      {g && <GraphView nodes={nodes} links={links} highlight={highlight} selected={selected} onSelect={(id) => setSelected(id === g.me ? null : id)} fitKey={1} insetX={-420} />}
      <Nav floating />

      <aside className="panel scroll-thin absolute right-3 bottom-3 left-3 z-20 max-h-[55vh] overflow-y-auto p-5 md:top-[4.6rem] md:right-auto md:max-h-none md:w-[420px]">
        {!g ? (
          <p className="text-mist">Gathering the club&apos;s maps</p>
        ) : sel ? (
          <NodeDetail
            node={sel}
            meId={g.me}
            meEmail={me?.email || ""}
            path={pathTo(sel.id)}
            nameOf={nameOf}
            onBack={() => setSelected(null)}
            onIntro={f?.intros ?? true ? () => setIntro(sel) : null}
          />
        ) : (
          <div className="space-y-7">
            <section>
              <h1 className="display text-3xl leading-tight">Club reach</h1>
              <p className="mt-2 text-sm leading-relaxed text-mist">
                Everyone&apos;s maps, woven together. You see roles, places and interests, never names. Introductions go through
                the member who knows them.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { n: g.members.length, l: g.members.length === 1 ? "member" : "members" },
                  { n: people.length, l: "people reached" },
                  { n: countries, l: countries === 1 ? "country" : "countries" },
                ].map((x) => (
                  <div key={x.l}>
                    <div className="display text-3xl">{x.n}</div>
                    <div className="text-xs text-dim">{x.l}</div>
                  </div>
                ))}
              </div>
              {people.length > 0 && (
                <p className="mt-4 text-sm text-mist">
                  Through the club you&apos;re two steps from{" "}
                  <span className="text-star">{people.filter((p) => (steps.get(p.id) ?? 99) <= 2).length}</span> people and three steps from{" "}
                  <span className="text-star">{people.filter((p) => (steps.get(p.id) ?? 99) <= 3).length}</span>.
                </p>
              )}
            </section>

            {(f?.clubSearch ?? true) && (
            <section>
              <h2 className="display text-xl">Who are you trying to reach?</h2>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (question.trim().length >= 3) ask();
                }}
              >
                <label className="field flex items-center gap-2 !py-0">
                  <Search size={15} className="shrink-0 text-dim" />
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Someone at UNESCO working on education"
                    className="w-full bg-transparent py-2 outline-none placeholder:text-dim"
                    aria-label="Who are you trying to reach?"
                  />
                </label>
                <button className="btn btn-spore" disabled={asking || question.trim().length < 3}>
                  {asking ? "Looking" : "Find"}
                </button>
              </form>
              {answer && (
                <div className="mt-3">
                  {answer.matches.length === 0 ? (
                    <p className="text-sm text-mist">Nobody in the club&apos;s maps fits yet. That&apos;s a blind spot worth filling.</p>
                  ) : (
                    <ul className="space-y-2">
                      {answer.matches.map((m) => {
                        const n = byId.get(m.id);
                        if (!n) return null;
                        const p = pathTo(m.id);
                        return (
                          <li key={m.id}>
                            <button
                              onClick={() => setSelected(m.id)}
                              className="w-full rounded-xl border border-white/8 px-3.5 py-3 text-left hover:border-white/20"
                            >
                              <div className="font-medium">{n.mine || n.label}</div>
                              <p className="mt-0.5 text-sm text-mist">{m.reason}</p>
                              {p && <p className="mt-1 text-xs text-dim">{p.map(nameOf).join("  ›  ")}</p>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="mt-2 flex items-center justify-between text-xs text-dim">
                    <span className="flex items-center gap-1">{answer.mode === "ai" && <Sparkles size={12} />} {answer.mode === "ai" ? "Matched by AI" : "Matched by keywords"}</span>
                    <button className="hover:text-star" onClick={() => (setAnswer(null), setQuestion(""))}>
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </section>
            )}

            <section>
              <h2 className="display text-xl">Where the club reaches</h2>
              <p className="mt-1 text-sm text-mist">People known per field. Pick one to light it up on the map.</p>
              <ul className="mt-3 space-y-1.5">
                {fieldCounts
                  .filter(([, n]) => n > 0)
                  .map(([f, n]) => (
                    <li key={f}>
                      <button
                        onClick={() => (setFieldFilter(fieldFilter === f ? null : f), setAnswer(null))}
                        className={`grid w-full grid-cols-[9.5rem_1fr_2rem] items-center gap-2 rounded-lg px-1.5 py-1 text-left text-sm ${fieldFilter === f ? "bg-white/8" : "hover:bg-white/5"}`}
                      >
                        <span className="truncate text-mist">{f}</span>
                        <span className="h-1.5 rounded-full bg-white/6">
                          <span
                            className="block h-1.5 rounded-full"
                            style={{ width: `${(n / maxField) * 100}%`, background: fieldColor(f), boxShadow: `0 0 8px ${fieldColor(f)}` }}
                          />
                        </span>
                        <span className="text-right text-xs text-dim">{n}</span>
                      </button>
                    </li>
                  ))}
              </ul>
              {blindSpots.length > 0 && (
                <div className="mt-4 rounded-xl border border-rose/25 bg-rose/5 p-3.5">
                  <h3 className="text-sm font-medium text-rose">Blind spots</h3>
                  <p className="mt-1 text-sm leading-relaxed text-mist">
                    Nobody in the club knows anyone in {blindSpots.join(", ").toLowerCase()}. These are good fields to invite
                    speakers from, or to ask friends outside the club about.
                  </p>
                </div>
              )}
            </section>

            <section>
              <h2 className="display text-xl">Members</h2>
              <ul className="mt-2 space-y-1.5">
                {g.members
                  .sort((a, b) => b.people - a.people)
                  .map((m) => (
                    <li key={m.email} className="flex items-center gap-2.5 text-sm">
                      {m.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.image} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="h-6 w-6 rounded-full bg-white/10" />
                      )}
                      <span className="flex-1">{m.name}</span>
                      <span className="text-xs text-dim">{m.people ? `${m.people} people mapped` : "hasn't mapped yet"}</span>
                    </li>
                  ))}
              </ul>
            </section>
          </div>
        )}
      </aside>

      {intro && me && (
        <IntroModal
          node={intro}
          meEmail={me.email}
          onClose={() => setIntro(null)}
          onSent={(m) => {
            setIntro(null);
            toast(m);
          }}
        />
      )}
      {msg && (
        <div role="status" className="panel absolute bottom-6 left-1/2 z-50 -translate-x-1/2 px-4 py-2 text-sm">
          {msg}
        </div>
      )}
    </main>
  );
}

function NodeDetail({
  node,
  meId,
  meEmail,
  path,
  nameOf,
  onBack,
  onIntro,
}: {
  node: BlindNode;
  meId: string;
  meEmail: string;
  path: string[] | null;
  nameOf: (id: string) => string;
  onBack: () => void;
  onIntro: (() => void) | null;
}) {
  const others = node.knownBy.filter((k) => k.email !== meEmail);
  const mine = node.knownBy.some((k) => k.email === meEmail);
  return (
    <div>
      <button className="btn btn-quiet -ml-2 mb-1" onClick={onBack}>
        <ArrowLeft size={15} /> Club overview
      </button>
      {node.type === "member" ? (
        <>
          <h2 className="display text-3xl">{node.label}</h2>
          <p className="mt-1 text-sm text-mist">Club member</p>
          {node.knownBy.length > 0 && (
            <p className="mt-3 text-sm text-mist">In the maps of {node.knownBy.map((k) => k.name).join(", ")}.</p>
          )}
        </>
      ) : (
        <>
          <h2 className="display text-2xl leading-snug">{node.mine || node.label}</h2>
          {node.mine && <p className="mt-1 text-sm text-mist">{node.label}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {node.field && <span className="chip">{node.field}</span>}
            {node.country && <span className="chip">{node.country}</span>}
            {node.tags.map((t) => (
              <span key={t} className="chip">{t}</span>
            ))}
          </div>
          <div className="mt-5">
            <h3 className="text-sm text-mist">Known by</h3>
            <ul className="mt-1.5 space-y-1 text-sm">
              {node.knownBy.map((k) => (
                <li key={k.email}>
                  {k.email === meEmail ? "You" : k.name}
                  <span className="text-dim"> {k.closeness >= 4 ? "know them well" : k.closeness >= 3 ? "know them" : "know them a little"}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      {path && path.length > 1 && (
        <div className="mt-5">
          <h3 className="text-sm text-mist">Warmest path</h3>
          <ol className="mt-2 space-y-1.5 border-l border-spore/40 pl-4 text-sm">
            {path.map((id) => (
              <li key={id} className={id === meId ? "text-spore" : ""}>
                {nameOf(id)}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-dim">
            {path.length - 1} {path.length === 2 ? "step" : "steps"} away
          </p>
        </div>
      )}
      {node.type === "person" && others.length > 0 && !mine && onIntro && (
        <button className="btn btn-spore mt-6" onClick={onIntro}>
          Ask {others.sort((a, b) => b.closeness - a.closeness)[0].name.split(" ")[0]} for an introduction
        </button>
      )}
      {node.type === "person" && mine && <p className="mt-6 text-sm text-mist">They&apos;re in your own map, so you can reach out directly.</p>}
    </div>
  );
}
