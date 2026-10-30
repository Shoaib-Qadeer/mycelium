import { getDb } from "./mongo";
import { getSettings } from "./settings";

export const envModel = () => process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

const dayStart = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export class AiLimitError extends Error {}

/**
 * Calls Gemini and returns parsed JSON. Applies the admin's AI switch, model, temperature
 * and daily limits, and logs every call for the admin panel. Throws on failure.
 */
export async function geminiJSON<T>(prompt: string, meta: { kind: "describe" | "search"; user: string }): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("AI is not set up yet (GEMINI_API_KEY missing).");
  const settings = await getSettings();
  if (!settings.ai.enabled) throw new AiLimitError("AI is switched off by the admin.");
  const db = await getDb();
  const log = db.collection("ai_log");
  const since = dayStart();
  const [total, mine] = await Promise.all([
    log.countDocuments({ at: { $gte: since } }),
    log.countDocuments({ at: { $gte: since }, user: meta.user }),
  ]);
  if (total >= settings.ai.dailyCallLimit) throw new AiLimitError("The club's AI budget for today is used up. Try again tomorrow.");
  if (mine >= settings.ai.perMemberDailyLimit) throw new AiLimitError("You've reached today's AI limit. Try again tomorrow.");

  const model = settings.ai.model || envModel();
  const started = Date.now();
  const entry = { at: new Date(), user: meta.user, kind: meta.kind, model, ok: false, inputTokens: 0, outputTokens: 0, ms: 0, error: "" as string };
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: settings.ai.temperature },
      }),
    });
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    entry.inputTokens = data?.usageMetadata?.promptTokenCount || 0;
    entry.outputTokens = data?.usageMetadata?.candidatesTokenCount || 0;
    const text: string = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
    const out = JSON.parse(text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()) as T;
    entry.ok = true;
    return out;
  } catch (e) {
    entry.error = e instanceof Error ? e.message.slice(0, 300) : "Failed";
    throw e;
  } finally {
    entry.ms = Date.now() - started;
    log.insertOne(entry).catch(() => {});
  }
}
