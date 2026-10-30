import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMe, unauthorized, bad } from "@/lib/auth";
import { getDb } from "@/lib/mongo";
import { toLink } from "@/lib/serialize";

// Connects two people in your map ("they know each other").
export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return unauthorized();
  const { a, b, label } = (await req.json().catch(() => ({}))) as { a?: string; b?: string; label?: string };
  if (!a || !b || a === b || !ObjectId.isValid(a) || !ObjectId.isValid(b)) return bad("Pick two different people.");
  const db = await getDb();
  const owned = await db
    .collection("people")
    .countDocuments({ owner: me.email, _id: { $in: [new ObjectId(a), new ObjectId(b)] } });
  if (owned !== 2) return bad("Both people must be in your map.");
  const dup = await db.collection("links").findOne({ owner: me.email, $or: [{ a, b }, { a: b, b: a }] });
  if (dup) return NextResponse.json({ link: toLink(dup) });
  const doc = { owner: me.email, a, b, label: String(label || "").slice(0, 80), createdAt: new Date() };
  const r = await db.collection("links").insertOne(doc);
  return NextResponse.json({ link: toLink({ ...doc, _id: r.insertedId }) });
}
