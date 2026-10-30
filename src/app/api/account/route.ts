import { NextResponse } from "next/server";
import { getViewer, unauthorized, bad } from "@/lib/auth";
import { getDb } from "@/lib/mongo";

/** What the signed-in member has stored, so they know what deleting removes. */
export async function GET() {
  const me = await getViewer();
  if (!me) return unauthorized();
  const db = await getDb();
  const [people, links, intros, user] = await Promise.all([
    db.collection("people").countDocuments({ owner: me.email }),
    db.collection("links").countDocuments({ owner: me.email }),
    db.collection("intros").countDocuments({ $or: [{ fromEmail: me.email }, { toEmail: me.email }] }),
    db.collection("users").findOne({ email: me.email }, { projection: { createdAt: 1 } }),
  ]);
  return NextResponse.json({
    people,
    links,
    intros,
    joined: user?.createdAt ? new Date(user.createdAt).toISOString() : null,
  });
}

/** Deletes the signed-in member's account and everything they added. */
export async function DELETE(req: Request) {
  const me = await getViewer();
  if (!me) return unauthorized();
  const { confirm } = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (confirm !== "DELETE") return bad("Type DELETE to confirm.");
  if (me.isAdmin) return bad("Admin accounts are set in Vercel (ADMIN_EMAILS). Remove yourself there first, then delete the account.");
  const db = await getDb();
  await Promise.all([
    db.collection("people").deleteMany({ owner: me.email }),
    db.collection("links").deleteMany({ owner: me.email }),
    db.collection("intros").deleteMany({ $or: [{ fromEmail: me.email }, { toEmail: me.email }] }),
    db.collection("ai_log").deleteMany({ user: me.email }),
    db.collection("users").deleteOne({ email: me.email }),
  ]);
  return NextResponse.json({ ok: true });
}
