import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMe, unauthorized, bad } from "@/lib/auth";
import { getDb } from "@/lib/mongo";

// The connector answers an intro request.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me) return unauthorized();
  const { id } = await params;
  if (!ObjectId.isValid(id)) return bad("Unknown request.", 404);
  const { status, responseNote } = (await req.json().catch(() => ({}))) as { status?: string; responseNote?: string };
  if (status !== "accepted" && status !== "declined") return bad("Choose accept or decline.");
  const db = await getDb();
  const r = await db
    .collection("intros")
    .updateOne(
      { _id: new ObjectId(id), toEmail: me.email },
      { $set: { status, responseNote: String(responseNote || "").slice(0, 600), answeredAt: new Date() } }
    );
  if (!r.matchedCount) return bad("Unknown request.", 404);
  return NextResponse.json({ ok: true });
}
