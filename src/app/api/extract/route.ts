import { NextResponse } from "next/server";
import { getMe, unauthorized, bad, featureOff } from "@/lib/auth";
import { FIELDS, cleanPerson } from "@/lib/fields";
import { geminiJSON } from "@/lib/gemini";
import { getSettings } from "@/lib/settings";

type Extracted = {
  people: Record<string, unknown>[];
  links: { a: string; b: string; label?: string }[];
};

// Brain dump: free text in, people + "who knows whom" out. Nothing is saved here;
// the user reviews the result first.
export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return unauthorized();
  const off = await featureOff("describe");
  if (off) return off;
  const guidance = (await getSettings()).ai.describeGuidance;
  const { text, existing } = (await req.json().catch(() => ({}))) as { text?: string; existing?: string[] };
  if (!text || text.trim().length < 3) return bad("Write a few lines about the people you know.");
  if (text.length > 12000) return bad("That's a lot at once. Split it into chunks under 12,000 characters.");

  const prompt = `You turn someone's free-form notes about the people they know into a structured personal network.
The writer is "me" — never include the writer as a person.

Return JSON: {"people":[...],"links":[...]}
Each person: {"name": string, "circle": string (the context they know them from, e.g. "COMSATS", "LPI", "Family", "Erasmus"), "field": one of ${JSON.stringify(FIELDS)} or "", "role": string, "org": string, "city": string, "country": string, "tags": string[] (2-5 short lowercase interests/skills), "closeness": 1-5 (5 = inner circle; guess 3 if unclear), "notes": short string with anything else useful}
Each link: {"a": name, "b": name, "label": how they are connected} — only when the text says or clearly implies two people know each other (introduced, colleagues, siblings, flatmates...). Never link "me".
Only use information in the text; leave unknown fields as "". Keep names exactly as written.
${guidance ? `Extra guidance from the club admin: ${guidance}\n` : ""}People already in the map (reuse these exact spellings if the text refers to them): ${JSON.stringify((existing || []).slice(0, 400))}

Notes:
"""${text}"""`;

  try {
    const out = await geminiJSON<Extracted>(prompt, { kind: "describe", user: me.email });
    const people = (out.people || []).map((p) => cleanPerson(p)).filter((p) => p.name);
    const links = (out.links || [])
      .filter((l) => l && l.a && l.b && l.a !== l.b)
      .map((l) => ({ a: String(l.a), b: String(l.b), label: String(l.label || "") }));
    return NextResponse.json({ people, links });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "The AI couldn't read that. Try again.", 502);
  }
}
