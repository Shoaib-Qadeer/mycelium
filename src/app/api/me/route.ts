import { NextResponse } from "next/server";
import { getMe, unauthorized } from "@/lib/auth";
import { getDb } from "@/lib/mongo";

export async function GET() {
  const me = await getMe();
  if (!me) return unauthorized();
  const db = await getDb();
  const pendingIntros = await db.collection("intros").countDocuments({ toEmail: me.email, status: "pending" });
  return NextResponse.json({ ...me, pendingIntros, aiEnabled: Boolean(process.env.GEMINI_API_KEY) });
}
