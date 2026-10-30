import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMe, unauthorized, bad } from "@/lib/auth";
import { getDb } from "@/lib/mongo";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me) return unauthorized();
  const { id } = await params;
  if (!ObjectId.isValid(id)) return bad("Unknown link.", 404);
  const db = await getDb();
  await db.collection("links").deleteOne({ _id: new ObjectId(id), owner: me.email });
  return NextResponse.json({ ok: true });
}
