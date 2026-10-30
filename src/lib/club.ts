import { createHash } from "crypto";
import { getDb } from "./mongo";
import { normName } from "./fields";
import type { BlindNode, ClubGraph } from "./types";

const salt = () => process.env.NEXTAUTH_SECRET || "mycelium";
const h = (s: string) => createHash("sha256").update(salt() + s).digest("hex").slice(0, 16);

/** Stable, non-reversible id for a person across members' maps. */
export function personNodeKey(p: { email?: string; name: string; nameKey?: string; owner: string }, members: Set<string>) {
  const email = (p.email || "").toLowerCase();
  if (email && members.has(email)) return `u:${email}`;
  if (email) return `p:${h("e:" + email)}`;
  const key = p.nameKey || normName(p.name);
  // Single names ("Ali") are too ambiguous to merge across members.
  if (key.split(" ").length < 2) return `p:${h("o:" + p.owner + ":" + key)}`;
  return `p:${h("n:" + key)}`;
}

export function blindLabel(n: { role: string; field: string; org: string; city: string }) {
  const who = n.role || (n.field && n.field !== "Other" ? `Someone in ${n.field.toLowerCase()}` : "Someone");
  const where = n.org ? ` at ${n.org}` : "";
  const city = n.city ? `, ${n.city}` : "";
  return `${who}${where}${city}`;
}

export async function buildClubGraph(viewer: string, showOrg = true): Promise<ClubGraph> {
  const db = await getDb();
  const [users, people, links] = await Promise.all([
    db.collection("users").find({ status: { $nin: ["pending", "blocked"] } }, { projection: { email: 1, name: 1, image: 1 } }).toArray(),
    db.collection("people").find({ hidden: { $ne: true } }).toArray(),
    db.collection("links").find({}).toArray(),
  ]);
  const memberSet = new Set(users.map((u) => u.email as string));
  const nameOf = new Map(users.map((u) => [u.email as string, (u.name as string) || u.email]));

  const nodes = new Map<string, BlindNode>();
  for (const u of users) {
    nodes.set(`u:${u.email}`, {
      id: `u:${u.email}`,
      type: "member",
      label: (u.name as string) || u.email,
      field: "",
      role: "",
      org: "",
      city: "",
      country: "",
      tags: [],
      knownBy: [],
    });
  }

  const edgeKeys = new Set<string>();
  const edges: ClubGraph["edges"] = [];
  const addEdge = (a: string, b: string, kind: "knows" | "link") => {
    if (a === b) return;
    const k = [a, b].sort().join("|");
    if (edgeKeys.has(k)) return;
    edgeKeys.add(k);
    edges.push({ source: a, target: b, kind });
  };

  const nodeOfPerson = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const p of people) {
    const owner = p.owner as string;
    if (!memberSet.has(owner)) continue;
    counts.set(owner, (counts.get(owner) || 0) + 1);
    const id = personNodeKey({ email: p.email, name: p.name, nameKey: p.nameKey, owner }, memberSet);
    nodeOfPerson.set(p._id.toString(), id);
    if (id.startsWith("p:")) {
      let n = nodes.get(id);
      if (!n) {
        n = { id, type: "person", label: "", field: "", role: "", org: "", city: "", country: "", tags: [], knownBy: [] };
        nodes.set(id, n);
      }
      for (const k of ["field", "role", "org", "city", "country"] as const) if (!n[k] && p[k]) n[k] = p[k];
      n.tags = Array.from(new Set([...n.tags, ...((p.tags as string[]) || [])])).slice(0, 10);
      n.knownBy.push({ email: owner, name: nameOf.get(owner) || owner, closeness: p.closeness || 3 });
      if (owner === viewer) n.mine = p.name;
    } else {
      const m = nodes.get(id);
      if (m) m.knownBy.push({ email: owner, name: nameOf.get(owner) || owner, closeness: p.closeness || 3 });
    }
    addEdge(`u:${owner}`, id, "knows");
  }
  for (const n of nodes.values()) {
    if (n.type !== "person") continue;
    if (!showOrg) n.org = "";
    n.label = blindLabel(n);
  }

  for (const l of links) {
    const a = nodeOfPerson.get(String(l.a));
    const b = nodeOfPerson.get(String(l.b));
    if (a && b) addEdge(a, b, "link");
  }

  return {
    me: `u:${viewer}`,
    nodes: Array.from(nodes.values()),
    edges,
    members: users.map((u) => ({
      email: u.email as string,
      name: (u.name as string) || (u.email as string),
      image: (u.image as string) || "",
      people: counts.get(u.email as string) || 0,
    })),
  };
}
