import { NextResponse } from "next/server";
import { getAdmin, unauthorized, bad, isAdminEmail } from "@/lib/auth";
import { getDb } from "@/lib/mongo";

const count = (rows: { _id: unknown; n: number }[]) => new Map(rows.map((r) => [String(r._id), r.n]));

/** Everyone who has signed in, with what an admin needs to approve and manage them. */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return unauthorized();
  const db = await getDb();
  const group = (coll: string, field: string) =>
    db.collection(coll).aggregate<{ _id: unknown; n: number }>([{ $group: { _id: `$${field}`, n: { $sum: 1 } } }]).toArray();
  const [users, guests, people, links, sent, received] = await Promise.all([
    db.collection("users").find({}).sort({ createdAt: -1 }).limit(3000).toArray(),
    db.collection("allowlist").find({}, { projection: { email: 1 } }).toArray(),
    group("people", "owner"),
    group("links", "owner"),
    group("intros", "fromEmail"),
    group("intros", "toEmail"),
  ]);
  const g = new Set(guests.map((x) => x.email));
  const [p, l, s, r] = [count(people), count(links), count(sent), count(received)];
  return NextResponse.json({
    members: users.map((u) => ({
      email: u.email,
      name: u.name || u.email,
      image: u.image || "",
      status: isAdminEmail(u.email) ? "active" : u.status || "active",
      isAdmin: isAdminEmail(u.email),
      isGuest: g.has(u.email),
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
      lastSeen: u.lastSeen ? new Date(u.lastSeen).toISOString() : null,
      people: p.get(u.email) || 0,
      links: l.get(u.email) || 0,
      introsSent: s.get(u.email) || 0,
      introsReceived: r.get(u.email) || 0,
    })),
  });
}

/** Approve, put back to waiting, or block — one member or many. Admins can't be changed. */
export async function PATCH(req: Request) {
  const admin = await getAdmin();
  if (!admin) return unauthorized();
  const { emails, status } = (await req.json().catch(() => ({}))) as { emails?: string[]; status?: string };
  if (!Array.isArray(emails) || !emails.length) return bad("Pick at least one member.");
  if (!["active", "pending", "blocked"].includes(String(status))) return bad("Unknown status.");
  const targets = emails.map((e) => String(e).toLowerCase()).filter((e) => !isAdminEmail(e));
  const db = await getDb();
  const r = await db
    .collection("users")
    .updateMany({ email: { $in: targets } }, { $set: { status, statusChangedAt: new Date(), statusChangedBy: admin.email } });
  return NextResponse.json({ updated: r.modifiedCount });
}

/** Deletes a member and everything they added: their map, connections and intro requests. */
export async function DELETE(req: Request) {
  const admin = await getAdmin();
  if (!admin) return unauthorized();
  const { email, confirm } = (await req.json().catch(() => ({}))) as { email?: string; confirm?: string };
  if (confirm !== "DELETE") return bad("Type DELETE to confirm.");
  const e = String(email || "").toLowerCase();
  if (!e) return bad("Which member?");
  if (isAdminEmail(e)) return bad("You can't delete an admin account here.");
  const db = await getDb();
  await Promise.all([
    db.collection("people").deleteMany({ owner: e }),
    db.collection("links").deleteMany({ owner: e }),
    db.collection("intros").deleteMany({ $or: [{ fromEmail: e }, { toEmail: e }] }),
    db.collection("users").deleteOne({ email: e }),
  ]);
  return NextResponse.json({ ok: true });
}
