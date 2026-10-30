import type { WithId, Document } from "mongodb";
import type { Person, Link } from "./types";

export function toPerson(d: WithId<Document>): Person {
  return {
    _id: d._id.toString(),
    name: d.name || "",
    circle: d.circle || "",
    field: d.field || "",
    role: d.role || "",
    org: d.org || "",
    city: d.city || "",
    country: d.country || "",
    tags: d.tags || [],
    closeness: d.closeness || 3,
    lastContact: d.lastContact || "",
    email: d.email || "",
    notes: d.notes || "",
    hidden: Boolean(d.hidden),
  };
}

export function toLink(d: WithId<Document>): Link {
  return { _id: d._id.toString(), a: String(d.a), b: String(d.b), label: d.label || "" };
}
