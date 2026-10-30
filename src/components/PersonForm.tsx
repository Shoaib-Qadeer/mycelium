"use client";

import { useState } from "react";
import { FIELDS, CLOSENESS_LABELS } from "@/lib/fields";
import type { Person } from "@/lib/types";

export type PersonDraft = Omit<Person, "_id" | "tags"> & { tags: string };

export const emptyDraft = (circle = ""): PersonDraft => ({
  name: "",
  circle,
  field: "",
  role: "",
  org: "",
  city: "",
  country: "",
  tags: "",
  closeness: 3,
  lastContact: "",
  email: "",
  notes: "",
  hidden: false,
});

export const toDraft = (p: Person): PersonDraft => ({ ...p, tags: p.tags.join(", ") });

export function Closeness({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex gap-1.5" role="radiogroup" aria-label="Closeness">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            aria-label={CLOSENESS_LABELS[v]}
            title={CLOSENESS_LABELS[v]}
            onClick={() => onChange(v)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 transition-colors hover:border-white/30"
          >
            <span
              className="block rounded-full"
              style={{
                width: 4 + v * 2.4,
                height: 4 + v * 2.4,
                background: v <= value ? "#F2C46D" : "rgba(185,196,255,0.18)",
                boxShadow: v <= value ? "0 0 10px rgba(242,196,109,0.6)" : "none",
              }}
            />
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-dim">{CLOSENESS_LABELS[value]}</p>
    </div>
  );
}

export default function PersonForm({
  initial,
  circles,
  submitLabel,
  onSubmit,
  busy,
  children,
}: {
  initial: PersonDraft;
  circles: string[];
  submitLabel: string;
  onSubmit: (d: PersonDraft) => void;
  busy?: boolean;
  children?: React.ReactNode;
}) {
  const [d, setD] = useState<PersonDraft>(initial);
  const set = <K extends keyof PersonDraft>(k: K, v: PersonDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (d.name.trim()) onSubmit(d);
      }}
    >
      <div>
        <label className="lbl" htmlFor="pf-name">Name</label>
        <input id="pf-name" className="field" value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Ana Lopez" required autoFocus={!initial.name} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="lbl" htmlFor="pf-circle">Circle</label>
          <input id="pf-circle" className="field" list="circles-list" value={d.circle} onChange={(e) => set("circle", e.target.value)} placeholder="Where you know them from" />
          <datalist id="circles-list">
            {circles.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="lbl" htmlFor="pf-field">Field</label>
          <select id="pf-field" className="field" value={d.field} onChange={(e) => set("field", e.target.value)}>
            <option value="">Not sure</option>
            {FIELDS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="lbl" htmlFor="pf-role">Role</label>
          <input id="pf-role" className="field" value={d.role} onChange={(e) => set("role", e.target.value)} placeholder="Policy officer" />
        </div>
        <div>
          <label className="lbl" htmlFor="pf-org">Organization</label>
          <input id="pf-org" className="field" value={d.org} onChange={(e) => set("org", e.target.value)} placeholder="WHO" />
        </div>
        <div>
          <label className="lbl" htmlFor="pf-city">City</label>
          <input id="pf-city" className="field" value={d.city} onChange={(e) => set("city", e.target.value)} placeholder="Geneva" />
        </div>
        <div>
          <label className="lbl" htmlFor="pf-country">Country</label>
          <input id="pf-country" className="field" value={d.country} onChange={(e) => set("country", e.target.value)} placeholder="Switzerland" />
        </div>
      </div>
      <div>
        <label className="lbl" htmlFor="pf-tags">Interests and skills</label>
        <input id="pf-tags" className="field" value={d.tags} onChange={(e) => set("tags", e.target.value)} placeholder="climate, data, photography" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="lbl">How close are you?</span>
          <Closeness value={d.closeness} onChange={(v) => set("closeness", v)} />
        </div>
        <div>
          <label className="lbl" htmlFor="pf-last">Last in touch</label>
          <input id="pf-last" type="date" className="field" value={d.lastContact} onChange={(e) => set("lastContact", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="lbl" htmlFor="pf-email">Email (optional)</label>
        <input id="pf-email" type="email" className="field" value={d.email} onChange={(e) => set("email", e.target.value)} placeholder="Only used to recognise them if they join" />
      </div>
      <div>
        <label className="lbl" htmlFor="pf-notes">Notes, private to you</label>
        <textarea id="pf-notes" className="field min-h-16" value={d.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-mist">
        <input type="checkbox" className="mt-1 accent-[#F2C46D]" checked={d.hidden} onChange={(e) => set("hidden", e.target.checked)} />
        <span>
          Keep out of club reach
          <span className="block text-xs text-dim">Club members never see names. Tick this to leave them out of the club map entirely.</span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button type="submit" className="btn btn-spore" disabled={busy || !d.name.trim()}>
          {busy ? "Saving" : submitLabel}
        </button>
        {children}
      </div>
    </form>
  );
}

export function draftToBody(d: PersonDraft) {
  return { ...d, tags: d.tags.split(",").map((t) => t.trim()).filter(Boolean) };
}
