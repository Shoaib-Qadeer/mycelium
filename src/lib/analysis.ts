import type { Person, Link, Insight } from "./types";

type Adj = Map<string, Set<string>>;

function buildAdj(people: Person[], links: Link[]): Adj {
  const adj: Adj = new Map(people.map((p) => [p._id, new Set<string>()]));
  for (const l of links) {
    if (adj.has(l.a) && adj.has(l.b) && l.a !== l.b) {
      adj.get(l.a)!.add(l.b);
      adj.get(l.b)!.add(l.a);
    }
  }
  return adj;
}

/** Groups of people who know each other (ignoring you). */
export function clusters(adj: Adj): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const comp: string[] = [];
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const v = queue.shift()!;
      comp.push(v);
      for (const w of adj.get(v)!) if (!seen.has(w)) (seen.add(w), queue.push(w));
    }
    out.push(comp);
  }
  return out.sort((a, b) => b.length - a.length);
}

/** People whose absence would split a group apart, with how many get cut off. */
export function articulation(adj: Adj): Map<string, number> {
  const disc = new Map<string, number>();
  const low = new Map<string, number>();
  const size = new Map<string, number>();
  const cut = new Map<string, number>();
  let t = 0;
  const dfs = (u: string, parent: string | null) => {
    disc.set(u, t);
    low.set(u, t);
    t++;
    size.set(u, 1);
    let children = 0;
    let severed = 0;
    const childSizes: number[] = [];
    for (const v of adj.get(u)!) {
      if (!disc.has(v)) {
        children++;
        dfs(v, u);
        childSizes.push(size.get(v)!);
        size.set(u, size.get(u)! + size.get(v)!);
        low.set(u, Math.min(low.get(u)!, low.get(v)!));
        if (parent !== null && low.get(v)! >= disc.get(u)!) severed += size.get(v)!;
      } else if (v !== parent) {
        low.set(u, Math.min(low.get(u)!, disc.get(v)!));
      }
    }
    if (parent === null && children > 1) {
      // root: everything except the largest child subtree gets cut off
      severed = childSizes.reduce((a, b) => a + b, 0) - Math.max(...childSizes);
    }
    if (severed > 0) cut.set(u, severed);
  };
  for (const v of adj.keys()) if (!disc.has(v)) dfs(v, null);
  return cut;
}

/** Brandes betweenness: who sits on the most shortest paths between others. */
export function betweenness(adj: Adj): Map<string, number> {
  const cb = new Map<string, number>([...adj.keys()].map((k) => [k, 0]));
  for (const s of adj.keys()) {
    const stack: string[] = [];
    const pred = new Map<string, string[]>();
    const sigma = new Map<string, number>();
    const dist = new Map<string, number>();
    for (const v of adj.keys()) (pred.set(v, []), sigma.set(v, 0), dist.set(v, -1));
    sigma.set(s, 1);
    dist.set(s, 0);
    const q = [s];
    while (q.length) {
      const v = q.shift()!;
      stack.push(v);
      for (const w of adj.get(v)!) {
        if (dist.get(w)! < 0) (q.push(w), dist.set(w, dist.get(v)! + 1));
        if (dist.get(w) === dist.get(v)! + 1) (sigma.set(w, sigma.get(w)! + sigma.get(v)!), pred.get(w)!.push(v));
      }
    }
    const delta = new Map<string, number>([...adj.keys()].map((k) => [k, 0]));
    while (stack.length) {
      const w = stack.pop()!;
      for (const v of pred.get(w)!) delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!));
      if (w !== s) cb.set(w, cb.get(w)! + delta.get(w)!);
    }
  }
  for (const [k, v] of cb) cb.set(k, v / 2);
  return cb;
}

const daysSince = (d: string) => (d ? (Date.now() - new Date(d).getTime()) / 86400000 : Infinity);

function shareOf<T extends string>(values: T[]) {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export type HealthReport = {
  stats: { people: number; links: number; groups: number; inner: number; fields: number; countries: number };
  insights: Insight[];
  groupOf: Map<string, number>;
};

export function analyze(people: Person[], links: Link[]): HealthReport {
  const byId = new Map(people.map((p) => [p._id, p]));
  const adj = buildAdj(people, links);
  const comps = clusters(adj);
  const groupOf = new Map<string, number>();
  comps.forEach((c, i) => c.forEach((id) => groupOf.set(id, i)));
  const real = comps.filter((c) => c.length > 1);
  const isolates = comps.filter((c) => c.length === 1).map((c) => c[0]);
  const insights: Insight[] = [];
  const name = (id: string) => byId.get(id)?.name || "someone";
  const listNames = (ids: string[], max = 3) =>
    ids.length <= max ? ids.map(name).join(", ") : `${ids.slice(0, max).map(name).join(", ")} and ${ids.length - max} more`;

  if (people.length === 0) {
    return {
      stats: { people: 0, links: 0, groups: 0, inner: 0, fields: 0, countries: 0 },
      insights: [],
      groupOf,
    };
  }

  // Bridges: single points of failure inside a group.
  const cut = articulation(adj);
  for (const [id, n] of [...cut.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)) {
    insights.push({
      id: `bridge-${id}`,
      kind: "watch",
      title: `${name(id)} holds a group together`,
      detail: `${n} ${n === 1 ? "person is" : "people are"} only connected to the rest of that group through ${name(id)}. If that tie fades, they drift apart from each other. Linking them directly to someone else in the group makes it sturdier.`,
      nodeIds: [id, ...[...adj.get(id)!]],
    });
  }

  // Brokers: people who connect otherwise separate parts.
  if (links.length >= 3) {
    const bc = betweenness(adj);
    const top = [...bc.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length) {
      insights.push({
        id: "brokers",
        kind: "strength",
        title: `Your brokers: ${listNames(top.map(([id]) => id))}`,
        detail: "These people sit between the most pairs of your contacts. They're the ones to ask when you need a bridge into a new circle.",
        nodeIds: top.map(([id]) => id),
      });
    }
  }

  // You are the only bridge.
  if (isolates.length && people.length > 2) {
    insights.push({
      id: "only-you",
      kind: "watch",
      title: `${isolates.length} ${isolates.length === 1 ? "person knows" : "people know"} nobody else in your map`,
      detail: `${listNames(isolates, 4)} reach the rest of your network only through you. That's either a gap in your map (add who they know) or an opening to introduce them to someone.`,
      nodeIds: isolates,
    });
  }

  if (real.length > 1) {
    insights.push({
      id: "groups",
      kind: "strength",
      title: `${real.length} separate groups`,
      detail: `Your network has ${real.length} groups that don't overlap, the largest with ${real[0].length} people. You're the bridge between them, which gives you access to different worlds.`,
      nodeIds: real.flat(),
    });
  }

  // Fading ties.
  const fading = people.filter((p) => p.closeness >= 4 && daysSince(p.lastContact) > 90 && p.lastContact);
  if (fading.length) {
    insights.push({
      id: "fading",
      kind: "watch",
      title: `${fading.length} close ${fading.length === 1 ? "tie is" : "ties are"} fading`,
      detail: `You marked ${listNames(fading.map((p) => p._id))} as close, but haven't been in touch for over 3 months. A quick message keeps them close.`,
      nodeIds: fading.map((p) => p._id),
    });
  }

  // Diversity.
  const circles = shareOf(people.map((p) => p.circle));
  if (circles.length && people.length >= 6) {
    const [top, n] = circles[0];
    const pct = Math.round((n / people.length) * 100);
    if (pct >= 60)
      insights.push({
        id: "circle-heavy",
        kind: "watch",
        title: `${pct}% of your map comes from ${top}`,
        detail: `Most of your network shares one context. If that context changes (you graduate, move, switch jobs), much of your network moves with it.`,
        nodeIds: people.filter((p) => p.circle === top).map((p) => p._id),
      });
    else if (circles.length >= 3)
      insights.push({
        id: "circle-diverse",
        kind: "strength",
        title: `Spread across ${circles.length} circles`,
        detail: `No single context dominates. Your largest circle, ${top}, is ${pct}% of your map.`,
        nodeIds: [],
      });
  }

  const fields = shareOf(people.map((p) => p.field));
  const lonely = fields.filter(([f, n]) => n === 1 && f !== "Other");
  if (lonely.length) {
    const ids = people.filter((p) => lonely.some(([f]) => f === p.field)).map((p) => p._id);
    insights.push({
      id: "one-door",
      kind: "watch",
      title: `One door into ${lonely.length === 1 ? lonely[0][0].toLowerCase() : `${lonely.length} fields`}`,
      detail: `You know exactly one person in ${lonely.map(([f]) => f.toLowerCase()).join(", ")}. ${listNames(ids, 4)} ${ids.length === 1 ? "is" : "are"} your only way in.`,
      nodeIds: ids,
    });
  }

  const countries = shareOf(people.map((p) => p.country));
  if (countries.length >= 3) {
    insights.push({
      id: "countries",
      kind: "strength",
      title: `Reach across ${countries.length} countries`,
      detail: countries.slice(0, 5).map(([c, n]) => `${c} (${n})`).join(", "),
      nodeIds: [],
    });
  }

  // Matchmaker: pairs worth introducing.
  const linked = new Set(links.map((l) => [l.a, l.b].sort().join("|")));
  const ideas: { a: Person; b: Person; score: number; why: string[] }[] = [];
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i];
      const b = people[j];
      if (linked.has([a._id, b._id].sort().join("|"))) continue;
      const shared = a.tags.filter((t) => b.tags.map((x) => x.toLowerCase()).includes(t.toLowerCase()));
      let score = shared.length * 2;
      const why: string[] = [];
      if (shared.length) why.push(`both into ${shared.slice(0, 2).join(" and ")}`);
      if (a.field && a.field === b.field && a.field !== "Other") (score += 1, why.push(`both in ${a.field.toLowerCase()}`));
      if (a.city && a.city.toLowerCase() === b.city.toLowerCase()) (score += 1, why.push(`both in ${a.city}`));
      if (score >= 2 && groupOf.get(a._id) !== groupOf.get(b._id)) score += 1;
      if (score >= 3 || (score >= 2 && shared.length)) ideas.push({ a, b, score, why });
    }
  }
  for (const idea of ideas.sort((x, y) => y.score - x.score).slice(0, 5)) {
    insights.push({
      id: `intro-${idea.a._id}-${idea.b._id}`,
      kind: "idea",
      title: `Introduce ${idea.a.name} and ${idea.b.name}?`,
      detail: `They don't know each other yet, but they're ${idea.why.join(", ")}.`,
      nodeIds: [idea.a._id, idea.b._id],
    });
  }

  return {
    stats: {
      people: people.length,
      links: links.length,
      groups: real.length + isolates.length,
      inner: people.filter((p) => p.closeness >= 4).length,
      fields: fields.length,
      countries: countries.length,
    },
    insights,
    groupOf,
  };
}

/** Shortest path on an undirected graph (BFS). */
export function shortestPath(
  start: string,
  goal: string,
  edges: { source: string; target: string }[],
  extra: [string, string][] = []
): string[] | null {
  const adj = new Map<string, string[]>();
  const add = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  };
  for (const e of edges) add(e.source, e.target);
  for (const [a, b] of extra) add(a, b);
  const prev = new Map<string, string | null>([[start, null]]);
  const q = [start];
  while (q.length) {
    const v = q.shift()!;
    if (v === goal) break;
    for (const w of adj.get(v) || []) if (!prev.has(w)) (prev.set(w, v), q.push(w));
  }
  if (!prev.has(goal)) return null;
  const path: string[] = [];
  for (let v: string | null = goal; v; v = prev.get(v) ?? null) path.unshift(v);
  return path;
}
