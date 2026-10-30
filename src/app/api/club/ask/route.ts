import { NextResponse } from "next/server";
import { getMe, unauthorized, bad } from "@/lib/auth";
import { buildClubGraph } from "@/lib/club";
import { geminiJSON } from "@/lib/gemini";
import type { BlindNode } from "@/lib/types";

const STOP = new Set("a an the of in at to for and or with who whom someone somebody anyone can could we i me my our is are be do does know knows find help someone's people person reach".split(" "));

function keywordScore(q: string, n: BlindNode) {
  const words = q.toLowerCase().split(/[^a-z0-9&]+/).filter((w) => w.length > 2 && !STOP.has(w));
  const hay = [n.role, n.org, n.field, n.city, n.country, ...n.tags].join(" ").toLowerCase();
  let s = 0;
  for (const w of words) if (hay.includes(w)) s += 1;
  return s;
}

// "Can we reach someone at UNESCO?" → the best matching (blind) people in the club's maps.
export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return unauthorized();
  const { question } = (await req.json().catch(() => ({}))) as { question?: string };
  if (!question || question.trim().length < 3) return bad("Ask who you're looking for.");
  const graph = await buildClubGraph(me.email);
  const candidates = graph.nodes.filter((n) => n.type === "person");
  if (!candidates.length) return NextResponse.json({ matches: [], mode: "none" });

  if (process.env.GEMINI_API_KEY) {
    try {
      const list = candidates.slice(0, 500).map((n) => ({
        id: n.id,
        role: n.role,
        org: n.org,
        field: n.field,
        city: n.city,
        country: n.country,
        tags: n.tags,
      }));
      const out = await geminiJSON<{ matches: { id: string; reason: string }[] }>(
        `A student club pooled its members' networks. Find the people who best answer this request.
Request: "${question.slice(0, 400)}"
People (anonymous): ${JSON.stringify(list)}
Return JSON {"matches":[{"id": string, "reason": one short sentence on why they fit}]} with at most 6 matches, best first. Return an empty list if nobody plausibly fits.`
      );
      const valid = new Set(candidates.map((c) => c.id));
      const matches = (out.matches || []).filter((m) => valid.has(m.id)).slice(0, 6);
      return NextResponse.json({ matches, mode: "ai" });
    } catch {
      // fall through to keyword matching
    }
  }
  const matches = candidates
    .map((n) => ({ id: n.id, score: keywordScore(question, n) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((m) => ({ id: m.id, reason: "Matches your keywords." }));
  return NextResponse.json({ matches, mode: "keywords" });
}
