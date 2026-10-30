"use client";

import { useState } from "react";
import { ArrowLeft, Trash2, X } from "lucide-react";
import PersonForm, { draftToBody, toDraft } from "./PersonForm";
import type { Person, Link } from "@/lib/types";

export default function PersonPanel({
  person,
  people,
  links,
  circles,
  isMember,
  onBack,
  onChanged,
  onSelect,
  toast,
}: {
  person: Person;
  people: Person[];
  links: Link[];
  circles: string[];
  isMember: boolean;
  onBack: () => void;
  onChanged: () => Promise<void> | void;
  onSelect: (id: string) => void;
  toast: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [other, setOther] = useState("");
  const [label, setLabel] = useState("");
  const byId = new Map(people.map((p) => [p._id, p]));
  const mine = links
    .filter((l) => l.a === person._id || l.b === person._id)
    .map((l) => ({ link: l, other: byId.get(l.a === person._id ? l.b : l.a) }))
    .filter((x) => x.other) as { link: Link; other: Person }[];
  const connected = new Set(mine.map((m) => m.other._id));
  const candidates = people.filter((p) => p._id !== person._id && !connected.has(p._id));

  const connect = async () => {
    const target = candidates.find((p) => p.name.toLowerCase() === other.trim().toLowerCase());
    if (!target) return toast(`${other} isn't in your map yet. Add them first.`);
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a: person._id, b: target._id, label }),
    });
    if (!res.ok) return toast((await res.json()).error || "Couldn't connect them.");
    setOther("");
    setLabel("");
    await onChanged();
  };

  return (
    <div>
      <button className="btn btn-quiet -ml-2 mb-1" onClick={onBack}>
        <ArrowLeft size={15} /> Overview
      </button>
      <h2 className="display text-3xl leading-tight">{person.name}</h2>
      <p className="mt-1 text-sm text-mist">{[person.role, person.org, person.city].filter(Boolean).join(", ") || "No details yet"}</p>
      {isMember && <span className="chip mt-2 !text-moss">On Mycelium</span>}

      <section className="mt-5">
        <h3 className="mb-2 text-sm text-mist">Who do they know?</h3>
        {mine.length > 0 ? (
          <ul className="mb-3 flex flex-wrap gap-1.5">
            {mine.map(({ link, other: o }) => (
              <li key={link._id} className="chip !pr-1 !text-star">
                <button onClick={() => onSelect(o._id)} className="hover:underline" title={link.label || undefined}>
                  {o.name}
                </button>
                <button
                  aria-label={`Disconnect ${o.name}`}
                  className="rounded-full p-0.5 text-dim hover:bg-white/10 hover:text-star"
                  onClick={async () => {
                    await fetch(`/api/links/${link._id}`, { method: "DELETE" });
                    await onChanged();
                  }}
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-sm text-dim">Not connected to anyone else in your map yet.</p>
        )}
        {candidates.length > 0 && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (other.trim()) connect();
            }}
          >
            <input className="field" list="connect-list" placeholder="They know…" value={other} onChange={(e) => setOther(e.target.value)} aria-label="Person they know" />
            <datalist id="connect-list">
              {candidates.map((p) => (
                <option key={p._id} value={p.name} />
              ))}
            </datalist>
            <input className="field !w-28" placeholder="How" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="How they know each other" />
            <button className="btn btn-ghost" disabled={!other.trim()}>
              Connect
            </button>
          </form>
        )}
      </section>

      <section className="mt-6 border-t border-white/8 pt-5">
        <PersonForm
          key={person._id}
          initial={toDraft(person)}
          circles={circles}
          submitLabel="Save changes"
          busy={busy}
          onSubmit={async (d) => {
            setBusy(true);
            const res = await fetch(`/api/people/${person._id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(draftToBody(d)),
            });
            setBusy(false);
            if (!res.ok) return toast((await res.json()).error || "Couldn't save.");
            toast("Changes saved");
            await onChanged();
          }}
        >
          <button
            type="button"
            className="btn btn-quiet ml-auto !text-rose"
            onClick={async () => {
              if (!confirm(`Remove ${person.name} from your map? Their connections go too.`)) return;
              await fetch(`/api/people/${person._id}`, { method: "DELETE" });
              toast(`${person.name} removed`);
              onBack();
              await onChanged();
            }}
          >
            <Trash2 size={15} /> Remove
          </button>
        </PersonForm>
      </section>
    </div>
  );
}
