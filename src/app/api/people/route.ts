import { NextResponse } from "next/server";
import { getMe, unauthorized, bad } from "@/lib/auth";
import { getDb } from "@/lib/mongo";
import { cleanPerson, normName } from "@/lib/fields";
import { toPerson, toLink } from "@/lib/serialize";

// Returns the signed-in user's whole map: people + links between them.
export async function GET() {
  const me = await getMe();
  if (!me) return unauthorized();
  const db = await getDb();
  const [people, links, users] = await Promise.all([
    db.collection("people").find({ owner: me.email }).sort({ createdAt: 1 }).toArray(),
    db.collection("links").find({ owner: me.email }).toArray(),
    db.collection("users").find({}, { projection: { email: 1 } }).toArray(),
  ]);
  const memberEmails = users.map((u) => u.email);
  return NextResponse.json({ people: people.map(toPerson), links: links.map(toLink), memberEmails });
}

export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return unauthorized();
  const body = await req.json().catch(() => null);
  const p = cleanPerson(body || {});
  if (!p.name) return bad("Give the person a name.");
  const db = await getDb();
  const doc = { ...p, owner: me.email, nameKey: normName(p.name), createdAt: new Date(), updatedAt: new Date() };
  const r = await db.collection("people").insertOne(doc);
  return NextResponse.json({ person: toPerson({ ...doc, _id: r.insertedId }) });
}
