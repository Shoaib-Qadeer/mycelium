import { NextResponse } from "next/server";
import { getAdmin, unauthorized, bad } from "@/lib/auth";
import { getDb } from "@/lib/mongo";

/** Guests: people outside the allowed domains who may sign in. */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return unauthorized();
  const db = await getDb();
  const rows = await db.collection("allowlist").find({}).sort({ addedAt: -1 }).toArray();
  return NextResponse.json({ guests: rows.map((r) => ({ email: r.email, addedBy: r.addedBy, addedAt: r.addedAt })) });
}

export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return unauthorized();
  const { emails } = (await req.json().catch(() => ({}))) as { emails?: string };
  const list = String(emails || "")
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  if (!list.length) return bad("Add at least one valid email.");
  const db = await getDb();
  for (const email of list) {
    await db
      .collection("allowlist")
      .updateOne({ email }, { $setOnInsert: { email, addedBy: admin.email, addedAt: new Date() } }, { upsert: true });
    // A guest who signed in while waiting gets approved too.
    await db.collection("users").updateOne({ email, status: "pending" }, { $set: { status: "active", statusChangedAt: new Date() } });
  }
  return NextResponse.json({ added: list.length });
}

export async function DELETE(req: Request) {
  const admin = await getAdmin();
  if (!admin) return unauthorized();
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  if (!email) return bad("Which email?");
  const db = await getDb();
  await db.collection("allowlist").deleteOne({ email: email.toLowerCase() });
  return NextResponse.json({ ok: true });
}
