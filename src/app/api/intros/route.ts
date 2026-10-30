import { NextResponse } from "next/server";
import { ObjectId, type WithId, type Document } from "mongodb";
import { getMe, unauthorized, bad, featureOff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getDb } from "@/lib/mongo";
import { blindLabel, personNodeKey } from "@/lib/club";
import type { Intro } from "@/lib/types";

function toIntro(d: WithId<Document>, personName?: string): Intro {
  return {
    _id: d._id.toString(),
    fromEmail: d.fromEmail,
    fromName: d.fromName,
    toEmail: d.toEmail,
    toName: d.toName,
    personId: d.personId,
    personLabel: d.personLabel,
    personName,
    message: d.message,
    status: d.status,
    responseNote: d.responseNote || "",
    createdAt: (d.createdAt as Date).toISOString(),
  };
}

export async function GET() {
  const me = await getMe();
  if (!me) return unauthorized();
  const db = await getDb();
  const [received, sent] = await Promise.all([
    db.collection("intros").find({ toEmail: me.email }).sort({ createdAt: -1 }).limit(200).toArray(),
    db.collection("intros").find({ fromEmail: me.email }).sort({ createdAt: -1 }).limit(200).toArray(),
  ]);
  const ids = received.map((r) => r.personId).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const people = await db.collection("people").find({ owner: me.email, _id: { $in: ids } }).toArray();
  const names = new Map(people.map((p) => [p._id.toString(), p.name as string]));
  return NextResponse.json({
    received: received.map((r) => toIntro(r, names.get(r.personId))),
    sent: sent.map((s) => toIntro(s)),
  });
}

// Ask a club member to introduce you to someone in their map.
export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return unauthorized();
  const off = await featureOff("intros");
  if (off) return off;
  const { nodeId, viaEmail, message } = (await req.json().catch(() => ({}))) as {
    nodeId?: string;
    viaEmail?: string;
    message?: string;
  };
  if (!nodeId || !viaEmail) return bad("Pick who you'd like to meet and who should introduce you.");
  if (viaEmail === me.email) return bad("This person is already in your own map.");
  if (!message || message.trim().length < 10) return bad("Add a short note on why you'd like to meet (10+ characters).");

  const db = await getDb();
  const users = await db
    .collection("users")
    .find({ status: { $nin: ["pending", "blocked"] } }, { projection: { email: 1, name: 1 } })
    .toArray();
  const members = new Set(users.map((u) => u.email as string));
  const via = users.find((u) => u.email === viaEmail);
  if (!via) return bad("That member isn't on Mycelium.");

  const theirs = await db.collection("people").find({ owner: viaEmail, hidden: { $ne: true } }).toArray();
  const person = theirs.find(
    (p) => personNodeKey({ email: p.email, name: p.name, nameKey: p.nameKey, owner: viaEmail }, members) === nodeId
  );
  if (!person) return bad("That connection is no longer shared.", 404);

  const dup = await db
    .collection("intros")
    .findOne({ fromEmail: me.email, toEmail: viaEmail, personId: person._id.toString(), status: "pending" });
  if (dup) return bad("You already have a pending request for this intro.");

  const doc = {
    fromEmail: me.email,
    fromName: me.name,
    toEmail: viaEmail,
    toName: (via.name as string) || viaEmail,
    personId: person._id.toString(),
    personLabel: blindLabel({
      role: person.role || "",
      field: person.field || "",
      org: (await getSettings()).privacy.showOrgInClub ? person.org || "" : "",
      city: person.city || "",
    }),
    message: message.trim().slice(0, 1000),
    status: "pending",
    responseNote: "",
    createdAt: new Date(),
  };
  const r = await db.collection("intros").insertOne(doc);
  return NextResponse.json({ intro: toIntro({ ...doc, _id: r.insertedId }) });
}
