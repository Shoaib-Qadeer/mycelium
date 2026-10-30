import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMe, unauthorized, bad } from "@/lib/auth";
import { getDb } from "@/lib/mongo";
import { cleanPerson, normName } from "@/lib/fields";
import { toPerson } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const me = await getMe();
  if (!me) return unauthorized();
  const { id } = await params;
  if (!ObjectId.isValid(id)) return bad("Unknown person.", 404);
  const p = cleanPerson((await req.json().catch(() => null)) || {});
  if (!p.name) return bad("Give the person a name.");
  const db = await getDb();
  const r = await db
    .collection("people")
    .findOneAndUpdate(
      { _id: new ObjectId(id), owner: me.email },
      { $set: { ...p, nameKey: normName(p.name), updatedAt: new Date() } },
      { returnDocument: "after" }
    );
  if (!r) return bad("Unknown person.", 404);
  return NextResponse.json({ person: toPerson(r) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const me = await getMe();
  if (!me) return unauthorized();
  const { id } = await params;
  if (!ObjectId.isValid(id)) return bad("Unknown person.", 404);
  const db = await getDb();
  await db.collection("people").deleteOne({ _id: new ObjectId(id), owner: me.email });
  await db.collection("links").deleteMany({ owner: me.email, $or: [{ a: id }, { b: id }] });
  return NextResponse.json({ ok: true });
}
