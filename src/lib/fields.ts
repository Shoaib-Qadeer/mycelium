export const FIELDS = [
  "Tech & AI",
  "Research & academia",
  "Education",
  "Climate & environment",
  "Health",
  "Policy & government",
  "NGO & nonprofit",
  "Business & startups",
  "Finance",
  "Law",
  "Media & journalism",
  "Arts & design",
  "Engineering",
  "Other",
];

// Bioluminescent palette for circles / fields on the night canvas.
export const GLOW = [
  "#7FD6E8", // spore cyan
  "#F29BB2", // rose
  "#A8E39A", // moss
  "#B9A6FF", // lilac
  "#FFAE85", // ember
  "#6FB7FF", // deep-sea blue
  "#F7E28B", // pollen
  "#E79BF0", // orchid
  "#8BE8C8", // lichen
  "#FF8FA0", // coral
];

export const YOU_COLOR = "#F2C46D";

export function colorFor(key: string, keys: string[]): string {
  const i = keys.indexOf(key);
  if (i < 0) return "#8E97C7";
  return GLOW[i % GLOW.length];
}

export const CLOSENESS_LABELS: Record<number, string> = {
  1: "Met once or twice",
  2: "Acquaintance",
  3: "Friendly",
  4: "Close",
  5: "Inner circle",
};

export function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanPerson(input: Record<string, unknown>) {
  const str = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  let tags: string[] = [];
  if (Array.isArray(input.tags)) tags = input.tags.map((t) => str(t, 40)).filter(Boolean);
  else if (typeof input.tags === "string")
    tags = input.tags.split(/[;,]/).map((t) => t.trim().slice(0, 40)).filter(Boolean);
  let closeness = Number(input.closeness);
  if (!Number.isFinite(closeness)) closeness = 3;
  closeness = Math.min(5, Math.max(1, Math.round(closeness)));
  let field = str(input.field, 60);
  if (field && !FIELDS.includes(field)) {
    const hit = FIELDS.find((f) => f.toLowerCase().includes(field.toLowerCase()) || field.toLowerCase().includes(f.split(" ")[0].toLowerCase()));
    field = hit || "Other";
  }
  const lc = str(input.lastContact, 10);
  return {
    name: str(input.name, 80),
    circle: str(input.circle, 60),
    field,
    role: str(input.role, 80),
    org: str(input.org, 80),
    city: str(input.city, 60),
    country: str(input.country, 60),
    tags: Array.from(new Set(tags)).slice(0, 12),
    closeness,
    lastContact: /^\d{4}-\d{2}-\d{2}$/.test(lc) ? lc : "",
    email: str(input.email, 120).toLowerCase(),
    notes: str(input.notes, 1000),
    hidden: Boolean(input.hidden),
  };
}
