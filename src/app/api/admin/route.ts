import { NextResponse } from "next/server";
import { getMe, unauthorized, bad, allowedDomains, adminEmails } from "@/lib/auth";
import { getDb } from "@/lib/mongo";

async function requireAdmin() {
  const me = await getMe();
  return me?.isAdmin ? me : null;
}

export async function GET() {
  const me = await requireAdmin();
  if (!me) return unauthorized();
  const db = await getDb();
  const [allowlist, users, peopleCounts] = await Promise.all([
    db.collection("allowlist").find({}).sort({ addedAt: -1 }).toArray(),
    db.collection("users").find({}).sort({ createdAt: -1 }).toArray(),
    db.collection("people").aggregate([{ $group: { _id: "$owner", n: { $sum: 1 } } }]).toArray(),
  ]);
  const counts = new Map(peopleCounts.map((c) => [c._id, c.n]));
  return NextResponse.json({
    domains: allowedDomains(),
    admins: adminEmails(),
    allowlist: allowlist.map((a) => ({ email: a.email, addedBy: a.addedBy, addedAt: a.addedAt })),
    users: users.map((u) => ({
      email: u.email,
      name: u.name,
      lastSeen: u.lastSeen,
      people: counts.get(u.email) || 0,
    })),
  });
}

export async function POST(req: Request) {
  const me = await requireAdmin();
  if (!me) return unauthorized();
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
      .updateOne({ email }, { $setOnInsert: { email, addedBy: me.email, addedAt: new Date() } }, { upsert: true });
  }
  return NextResponse.json({ added: list.length });
}

export async function DELETE(req: Request) {
  const me = await requireAdmin();
  if (!me) return unauthorized();
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  if (!email) return bad("Which email?");
  const db = await getDb();
  await db.collection("allowlist").deleteOne({ email: email.toLowerCase() });
  return NextResponse.json({ ok: true });
}
