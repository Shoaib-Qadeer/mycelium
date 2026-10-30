import { NextResponse } from "next/server";
import { getAdmin, unauthorized } from "@/lib/auth";
import { getDb } from "@/lib/mongo";
import { getSettings } from "@/lib/settings";
import { envModel } from "@/lib/gemini";

const ATLAS_FREE_BYTES = 512 * 1024 * 1024;

/** Numbers for the admin overview. */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return unauthorized();
  const db = await getDb();
  const settings = await getSettings(true);
  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 13);

  const users = db.collection("users");
  const [active, pending, blocked, active7, people, hidden, links, introsPending, introsAccepted, introsDeclined, usageRows, log, stats] =
    await Promise.all([
      users.countDocuments({ status: { $nin: ["pending", "blocked"] } }),
      users.countDocuments({ status: "pending" }),
      users.countDocuments({ status: "blocked" }),
      users.countDocuments({ lastSeen: { $gte: weekAgo } }),
      db.collection("people").countDocuments({}),
      db.collection("people").countDocuments({ hidden: true }),
      db.collection("links").countDocuments({}),
      db.collection("intros").countDocuments({ status: "pending" }),
      db.collection("intros").countDocuments({ status: "accepted" }),
      db.collection("intros").countDocuments({ status: "declined" }),
      db
        .collection("ai_log")
        .aggregate<{ _id: string; calls: number; failed: number; tokens: number }>([
          { $match: { at: { $gte: since } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$at" } },
              calls: { $sum: 1 },
              failed: { $sum: { $cond: ["$ok", 0, 1] } },
              tokens: { $sum: { $add: ["$inputTokens", "$outputTokens"] } },
            },
          },
        ])
        .toArray(),
      db.collection("ai_log").find({}).sort({ at: -1 }).limit(40).toArray(),
      db.stats().catch(() => null),
    ]);

  const byDay = new Map(usageRows.map((r) => [r._id, r]));
  const usage = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since.getTime() + i * 86400_000).toISOString().slice(0, 10);
    const r = byDay.get(d);
    return { day: d, calls: r?.calls || 0, failed: r?.failed || 0, tokens: r?.tokens || 0 };
  });

  return NextResponse.json({
    counts: { active, pending, blocked, active7, people, hidden, links, introsPending, introsAccepted, introsDeclined },
    storage: { usedBytes: stats ? Number(stats.dataSize || 0) + Number(stats.indexSize || 0) : null, limitBytes: ATLAS_FREE_BYTES },
    ai: {
      keyConfigured: Boolean(process.env.GEMINI_API_KEY),
      enabled: settings.ai.enabled,
      model: settings.ai.model || envModel(),
      dailyCallLimit: settings.ai.dailyCallLimit,
      usage,
      log: log.map((l) => ({
        at: (l.at as Date).toISOString(),
        user: l.user,
        kind: l.kind,
        model: l.model,
        ok: l.ok,
        tokens: (l.inputTokens || 0) + (l.outputTokens || 0),
        ms: l.ms,
        error: l.error || "",
      })),
    },
  });
}
