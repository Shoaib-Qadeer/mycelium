import { NextResponse } from "next/server";
import { getViewer, unauthorized } from "@/lib/auth";
import { getDb } from "@/lib/mongo";
import { effectiveFeatures, getSettings } from "@/lib/settings";

export async function GET() {
  const me = await getViewer();
  if (!me) return unauthorized();
  const settings = await getSettings();
  const features = effectiveFeatures(settings);
  const db = await getDb();
  const pendingIntros =
    me.status === "active" && features.intros
      ? await db.collection("intros").countDocuments({ toEmail: me.email, status: "pending" })
      : 0;
  const pendingMembers = me.isAdmin ? await db.collection("users").countDocuments({ status: "pending" }) : 0;
  return NextResponse.json({
    ...me,
    pendingIntros,
    pendingMembers,
    aiEnabled: features.describe,
    features,
    banner: settings.banner,
  });
}
