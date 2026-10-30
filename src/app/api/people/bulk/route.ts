import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMe, unauthorized, bad } from "@/lib/auth";
import { getDb } from "@/lib/mongo";
import { cleanPerson, normName } from "@/lib/fields";

type Body = {
  people?: Record<string, unknown>[];
  links?: { a: string; b: string; label?: string }[];
};

// Adds many people at once (import, quick add, brain dump).
// People are matched by name: an existing person gets the new details merged in instead of a duplicate.
export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return unauthorized();
  const body = ((await req.json().catch(() => null)) || {}) as Body;
  const incoming = (body.people || []).slice(0, 3000).map((p) => ({ raw: p, clean: cleanPerson(p) })).filter((p) => p.clean.name);
  if (!incoming.length && !(body.links || []).length) return bad("Nothing to add.");

  const db = await getDb();
  const col = db.collection("people");
  const existing = await col.find({ owner: me.email }).toArray();
  const byKey = new Map<string, { _id: ObjectId; doc: Record<string, unknown> }>();
  for (const d of existing) byKey.set(d.nameKey || normName(d.name), { _id: d._id, doc: d });

  let added = 0;
  let updated = 0;
  for (const { raw, clean } of incoming) {
    const key = normName(clean.name);
    const hit = byKey.get(key);
    if (hit) {
      const set: Record<string, unknown> = { updatedAt: new Date() };
      for (const k of ["circle", "field", "role", "org", "city", "country", "lastContact", "email", "notes"] as const) {
        if (clean[k] && (raw[k] !== undefined || k === "field")) set[k] = clean[k];
      }
      if (raw.closeness !== undefined && raw.closeness !== "") set.closeness = clean.closeness;
      const tags = Array.from(new Set([...((hit.doc.tags as string[]) || []), ...clean.tags]));
      set.tags = tags;
      await col.updateOne({ _id: hit._id }, { $set: set });
      updated++;
    } else {
      const doc = { ...clean, owner: me.email, nameKey: key, createdAt: new Date(), updatedAt: new Date() };
      const r = await col.insertOne(doc);
      byKey.set(key, { _id: r.insertedId, doc });
      added++;
    }
  }

  // Links come by name; unknown names become new people so nothing is lost.
  const linkCol = db.collection("links");
  const existingLinks = await linkCol.find({ owner: me.email }).toArray();
  const linkKeys = new Set(existingLinks.map((l) => [l.a, l.b].sort().join("|")));
  let linksAdded = 0;
  for (const l of (body.links || []).slice(0, 5000)) {
    const ids: string[] = [];
    for (const name of [l.a, l.b]) {
      const key = normName(String(name || ""));
      if (!key) break;
      let hit = byKey.get(key);
      if (!hit) {
        const doc = { ...cleanPerson({ name }), owner: me.email, nameKey: key, createdAt: new Date(), updatedAt: new Date() };
        const r = await col.insertOne(doc);
        hit = { _id: r.insertedId, doc };
        byKey.set(key, hit);
        added++;
      }
      ids.push(hit._id.toString());
    }
    if (ids.length !== 2 || ids[0] === ids[1]) continue;
    const k = [...ids].sort().join("|");
    if (linkKeys.has(k)) continue;
    linkKeys.add(k);
    await linkCol.insertOne({ owner: me.email, a: ids[0], b: ids[1], label: String(l.label || "").slice(0, 80), createdAt: new Date() });
    linksAdded++;
  }

  return NextResponse.json({ added, updated, linksAdded });
}
