import Papa from "papaparse";
import type { Person, Link } from "./types";

export const TEMPLATE_HEADERS = [
  "name",
  "circle",
  "field",
  "role",
  "org",
  "city",
  "country",
  "tags",
  "closeness",
  "last_contact",
  "email",
  "notes",
  "knows",
];

export const TEMPLATE_EXAMPLE = [
  ["Ana Lopez", "Erasmus", "Policy & government", "Policy officer", "WHO", "Geneva", "Switzerland", "health; policy", "4", "2026-09-12", "", "Met in Lisbon", "Ben Okafor"],
  ["Ben Okafor", "Erasmus", "Climate & environment", "Researcher", "", "Stockholm", "Sweden", "climate; data", "3", "", "", "", ""],
  ["Sara Khan", "LPI", "Education", "Student", "Learning Planet Institute", "Paris", "France", "learning science", "5", "2026-10-20", "", "", ""],
];

export function templateCsv(): string {
  return Papa.unparse({ fields: TEMPLATE_HEADERS, data: TEMPLATE_EXAMPLE });
}

const ALIASES: Record<string, string[]> = {
  name: ["name", "full name", "fullname", "person", "contact"],
  circle: ["circle", "group", "context", "where we met", "how we met"],
  field: ["field", "sector", "industry", "domain"],
  role: ["role", "position", "title", "job", "job title"],
  org: ["org", "organization", "organisation", "company", "employer", "school", "university"],
  city: ["city", "location", "town"],
  country: ["country"],
  tags: ["tags", "interests", "skills", "topics", "keywords"],
  closeness: ["closeness", "strength", "tie", "tie strength", "how close"],
  lastContact: ["last_contact", "last contact", "lastcontact", "last seen", "last talked"],
  email: ["email", "email address", "e-mail"],
  notes: ["notes", "note", "comments"],
  knows: ["knows", "connected to", "friends with", "links"],
};

export type ParsedImport = {
  kind: "linkedin" | "mycelium" | "generic";
  people: Record<string, unknown>[];
  links: { a: string; b: string; label?: string }[];
  unmatchedHeaders: string[];
};

export function parseImport(text: string): ParsedImport {
  // LinkedIn's Connections.csv starts with a few lines of notes before the header row.
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const liStart = lines.findIndex((l) => /^"?First Name"?,/i.test(l));
  if (liStart >= 0) {
    const res = Papa.parse<Record<string, string>>(lines.slice(liStart).join("\n"), { header: true, skipEmptyLines: true });
    const people = res.data
      .map((r) => ({
        name: `${r["First Name"] || ""} ${r["Last Name"] || ""}`.trim(),
        org: r["Company"] || "",
        role: r["Position"] || "",
        email: r["Email Address"] || "",
        circle: "LinkedIn",
        closeness: 2,
      }))
      .filter((p) => p.name);
    return { kind: "linkedin", people, links: [], unmatchedHeaders: [] };
  }

  const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  const headers = res.meta.fields || [];
  const map: Record<string, string> = {};
  const unmatched: string[] = [];
  for (const h of headers) {
    const key = Object.entries(ALIASES).find(([, al]) => al.includes(h))?.[0];
    if (key && !Object.values(map).includes(key)) map[h] = key;
    else unmatched.push(h);
  }
  // First/last name columns
  const first = headers.find((h) => ["first name", "firstname", "given name"].includes(h));
  const last = headers.find((h) => ["last name", "lastname", "surname", "family name"].includes(h));

  const people: Record<string, unknown>[] = [];
  const links: { a: string; b: string }[] = [];
  for (const row of res.data) {
    const p: Record<string, unknown> = {};
    for (const [h, key] of Object.entries(map)) if (row[h] !== undefined && row[h] !== "") p[key] = row[h];
    if (!p.name && (first || last)) p.name = `${row[first || ""] || ""} ${row[last || ""] || ""}`.trim();
    if (!p.name) continue;
    if (typeof p.knows === "string") {
      for (const other of p.knows.split(/[;|]/).map((s) => s.trim()).filter(Boolean)) links.push({ a: String(p.name), b: other });
    }
    delete p.knows;
    people.push(p);
  }
  const isOurs = ["name", "circle", "closeness", "knows"].every((h) => headers.includes(h));
  return { kind: isOurs ? "mycelium" : "generic", people, links, unmatchedHeaders: unmatched.filter((h) => !["first name", "last name", "firstname", "lastname", "surname", "given name", "family name"].includes(h)) };
}

export function exportCsv(people: Person[], links: Link[]): string {
  const byId = new Map(people.map((p) => [p._id, p.name]));
  const knows = new Map<string, string[]>();
  for (const l of links) {
    // write each link once, on the first person
    const a = byId.get(l.a);
    const b = byId.get(l.b);
    if (a && b) knows.set(l.a, [...(knows.get(l.a) || []), b]);
  }
  return Papa.unparse({
    fields: TEMPLATE_HEADERS,
    data: people.map((p) => [
      p.name,
      p.circle,
      p.field,
      p.role,
      p.org,
      p.city,
      p.country,
      p.tags.join("; "),
      String(p.closeness),
      p.lastContact,
      p.email,
      p.notes,
      (knows.get(p._id) || []).join("; "),
    ]),
  });
}

export function download(filename: string, text: string, type = "text/csv") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
