"use client";

import { useRef, useState } from "react";
import { Download, FileUp, Sparkles, UserPlus, Users } from "lucide-react";
import Modal from "./Modal";
import PersonForm, { Closeness, draftToBody, emptyDraft } from "./PersonForm";
import { FIELDS } from "@/lib/fields";
import { download, parseImport, templateCsv, type ParsedImport } from "@/lib/csv";

export type AddMode = "one" | "quick" | "describe" | "import";

const TABS: { id: AddMode; label: string; icon: React.ReactNode }[] = [
  { id: "one", label: "One person", icon: <UserPlus size={15} /> },
  { id: "quick", label: "Quick add", icon: <Users size={15} /> },
  { id: "describe", label: "Describe", icon: <Sparkles size={15} /> },
  { id: "import", label: "Import file", icon: <FileUp size={15} /> },
];

async function postBulk(people: Record<string, unknown>[], links: { a: string; b: string; label?: string }[]) {
  let added = 0,
    updated = 0,
    linksAdded = 0;
  for (let i = 0; i < Math.max(people.length, 1); i += 500) {
    const res = await fetch("/api/people/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ people: people.slice(i, i + 500), links: i === 0 ? links : [] }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "Couldn't save.");
    added += j.added;
    updated += j.updated;
    linksAdded += j.linksAdded;
  }
  return { added, updated, linksAdded };
}

const summary = (r: { added: number; updated: number; linksAdded: number }) =>
  [
    r.added && `${r.added} added`,
    r.updated && `${r.updated} updated`,
    r.linksAdded && `${r.linksAdded} connection${r.linksAdded === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(", ") || "Nothing new to add";

export default function AddModal({
  initial,
  circles,
  existingNames,
  aiEnabled,
  enabled,
  onClose,
  onDone,
}: {
  enabled: Record<AddMode, boolean>;
  initial: AddMode;
  circles: string[];
  existingNames: string[];
  aiEnabled: boolean;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [tab, setTab] = useState<AddMode>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setErr("");
    try {
      onDone(await fn());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Add to your map" onClose={onClose} wide={tab === "describe" || tab === "import"}>
      <div className="mb-4 flex gap-1 overflow-x-auto scroll-thin rounded-full border border-white/10 p-1">
        {TABS.filter((t) => enabled[t.id]).map((t) => (
          <button
            key={t.id}
            onClick={() => (setTab(t.id), setErr(""))}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
              tab === t.id ? "bg-white/12 text-star" : "text-mist hover:text-star"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      {err && <p className="mb-3 rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose">{err}</p>}

      {tab === "one" && (
        <PersonForm
          initial={emptyDraft()}
          circles={circles}
          submitLabel="Add person"
          busy={busy}
          onSubmit={(d) =>
            run(async () => {
              const res = await fetch("/api/people", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(draftToBody(d)),
              });
              const j = await res.json();
              if (!res.ok) throw new Error(j.error);
              return `${d.name} added`;
            })
          }
        />
      )}
      {tab === "quick" && <QuickAdd circles={circles} busy={busy} run={run} />}
      {tab === "describe" && <Describe aiEnabled={aiEnabled} existingNames={existingNames} busy={busy} run={run} setErr={setErr} />}
      {tab === "import" && <Import busy={busy} run={run} setErr={setErr} />}
    </Modal>
  );
}

type Run = (fn: () => Promise<string>) => void;

function QuickAdd({ circles, busy, run }: { circles: string[]; busy: boolean; run: Run }) {
  const [circle, setCircle] = useState(circles[0] || "");
  const [field, setField] = useState("");
  const [closeness, setCloseness] = useState(3);
  const [names, setNames] = useState("");
  const list = names.split(/\n|,/).map((n) => n.trim()).filter(Boolean);
  return (
    <div className="space-y-3">
      <p className="text-sm text-mist">Add a whole group at once, for example everyone from your class. You can fill in details later.</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="lbl" htmlFor="qa-circle">Circle</label>
          <input id="qa-circle" className="field" list="qa-circles" value={circle} onChange={(e) => setCircle(e.target.value)} placeholder="COMSATS friends" />
          <datalist id="qa-circles">
            {circles.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="lbl" htmlFor="qa-field">Field (optional)</label>
          <select id="qa-field" className="field" value={field} onChange={(e) => setField(e.target.value)}>
            <option value="">Mixed</option>
            {FIELDS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="lbl" htmlFor="qa-names">Names, one per line</label>
        <textarea id="qa-names" className="field min-h-40" value={names} onChange={(e) => setNames(e.target.value)} placeholder={"Ana Lopez\nBen Okafor\nSara Khan"} />
      </div>
      <div>
        <span className="lbl">How close are you to most of them?</span>
        <Closeness value={closeness} onChange={setCloseness} />
      </div>
      <label className="flex items-center gap-2 text-sm text-mist">
        <input type="checkbox" className="accent-[#F2C46D]" id="qa-know" defaultChecked={false} />
        They all know each other
      </label>
      <button
        className="btn btn-spore"
        disabled={busy || !list.length || !circle.trim()}
        onClick={() =>
          run(async () => {
            const allKnow = (document.getElementById("qa-know") as HTMLInputElement)?.checked;
            const links: { a: string; b: string; label: string }[] = [];
            if (allKnow && list.length <= 40)
              for (let i = 0; i < list.length; i++)
                for (let j = i + 1; j < list.length; j++) links.push({ a: list[i], b: list[j], label: circle });
            const r = await postBulk(
              list.map((name) => ({ name, circle, field, closeness })),
              links
            );
            return summary(r);
          })
        }
      >
        {busy ? "Adding" : `Add ${list.length || ""} ${list.length === 1 ? "person" : "people"}`}
      </button>
    </div>
  );
}

type Extracted = { people: Record<string, unknown>[]; links: { a: string; b: string; label: string }[] };

function Describe({
  aiEnabled,
  existingNames,
  busy,
  run,
  setErr,
}: {
  aiEnabled: boolean;
  existingNames: string[];
  busy: boolean;
  run: Run;
  setErr: (s: string) => void;
}) {
  const [text, setText] = useState("");
  const [reading, setReading] = useState(false);
  const [out, setOut] = useState<Extracted | null>(null);
  const [skip, setSkip] = useState<Set<number>>(new Set());

  if (!aiEnabled)
    return (
      <p className="text-sm text-mist">
        Describing people in your own words needs the AI key. Ask the admin to add <code>GEMINI_API_KEY</code> in Vercel, or use Quick add for now.
      </p>
    );

  const read = async () => {
    setReading(true);
    setErr("");
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, existing: existingNames }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setOut(j);
      setSkip(new Set());
      if (!j.people.length) setErr("No people found in that text. Mention them by name.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't read that.");
    } finally {
      setReading(false);
    }
  };

  if (out && out.people.length) {
    const kept = out.people.filter((_, i) => !skip.has(i));
    const keptNames = new Set(kept.map((p) => String(p.name)));
    const links = out.links.filter((l) => (keptNames.has(l.a) || existingNames.includes(l.a)) && (keptNames.has(l.b) || existingNames.includes(l.b)));
    return (
      <div className="space-y-3">
        <p className="text-sm text-mist">Here&apos;s what I found. Untick anyone you don&apos;t want to add.</p>
        <ul className="divide-y divide-white/8 rounded-xl border border-white/10">
          {out.people.map((p, i) => (
            <li key={i} className="flex items-start gap-3 px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-1 accent-[#F2C46D]"
                checked={!skip.has(i)}
                onChange={() => setSkip((s) => (s.has(i) ? (s.delete(i), new Set(s)) : new Set(s.add(i))))}
                aria-label={`Add ${String(p.name)}`}
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {String(p.name)}
                  {existingNames.includes(String(p.name)) && <span className="ml-2 text-xs text-cyan">already in your map, will update</span>}
                </div>
                <div className="text-sm text-mist">
                  {[p.role, p.org, p.city, p.circle].filter(Boolean).join(", ")}
                </div>
                {Array.isArray(p.tags) && p.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(p.tags as string[]).map((t) => (
                      <span key={t} className="chip">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
        {links.length > 0 && (
          <div>
            <p className="lbl">Who knows whom</p>
            <ul className="space-y-1 text-sm text-mist">
              {links.map((l, i) => (
                <li key={i}>
                  {l.a} and {l.b}
                  {l.label && <span className="text-dim"> ({l.label})</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex gap-2">
          <button className="btn btn-spore" disabled={busy || !kept.length} onClick={() => run(async () => summary(await postBulk(kept, links)))}>
            {busy ? "Adding" : `Add ${kept.length} to my map`}
          </button>
          <button className="btn btn-ghost" onClick={() => setOut(null)}>
            Edit text
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-mist">
        Write about people the way you&apos;d talk about them. Mention where you met, what they do, and who knows whom.
      </p>
      <textarea
        className="field min-h-48"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ana from my Erasmus year is now a policy officer at WHO in Geneva, we talk every few weeks. She introduced me to Ben, a climate researcher in Stockholm who loves data viz. Sara is my closest friend at LPI, into learning science."
      />
      <button className="btn btn-spore" disabled={reading || text.trim().length < 10} onClick={read}>
        <Sparkles size={15} />
        {reading ? "Reading your notes" : "Find the people"}
      </button>
    </div>
  );
}

function Import({ busy, run, setErr }: { busy: boolean; run: Run; setErr: (s: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [fileName, setFileName] = useState("");
  const [circle, setCircle] = useState("LinkedIn");

  const onFile = async (f: File) => {
    setErr("");
    setFileName(f.name);
    const text = await f.text();
    try {
      const p = parseImport(text);
      if (!p.people.length) {
        setErr("No people found. The file needs a name column (or First Name and Last Name).");
        setParsed(null);
      } else setParsed(p);
    } catch {
      setErr("Couldn't read that file. Save it as CSV and try again.");
    }
  };

  return (
    <div className="space-y-4">
      {!parsed && (
        <>
          <button
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 px-4 py-10 text-mist transition-colors hover:border-spore/60 hover:text-star"
            onClick={() => input.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
          >
            <FileUp size={26} />
            <span className="font-medium text-star">Choose a CSV file or drop it here</span>
            <span className="text-sm">The Mycelium template, LinkedIn&apos;s Connections.csv, or any sheet with a name column</span>
          </button>
          <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 p-4">
              <h3 className="display text-lg">Mycelium template</h3>
              <p className="mt-1 text-mist">
                One row per person. Put names they know in the <em>knows</em> column, separated by semicolons, to connect them.
              </p>
              <button className="btn btn-ghost mt-3" onClick={() => download("mycelium-template.csv", templateCsv())}>
                <Download size={15} /> Download template
              </button>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <h3 className="display text-lg">From LinkedIn</h3>
              <p className="mt-1 text-mist">
                On LinkedIn, open Settings, then Data privacy, then Get a copy of your data, and pick Connections. You&apos;ll get an email with Connections.csv.
              </p>
            </div>
          </div>
        </>
      )}
      {parsed && (
        <div className="space-y-3">
          <p className="text-sm text-mist">
            <span className="text-star">{fileName}</span>: {parsed.people.length} people
            {parsed.links.length ? ` and ${parsed.links.length} connections` : ""}
            {parsed.kind === "linkedin" ? " from LinkedIn" : ""}.
            {parsed.unmatchedHeaders.length > 0 && ` Columns skipped: ${parsed.unmatchedHeaders.join(", ")}.`}
          </p>
          {parsed.kind === "linkedin" && (
            <div className="max-w-xs">
              <label className="lbl" htmlFor="imp-circle">Put them in this circle</label>
              <input id="imp-circle" className="field" value={circle} onChange={(e) => setCircle(e.target.value)} />
            </div>
          )}
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-dim">
                <tr>
                  {["Name", "Circle", "Role", "Organization", "City"].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.people.slice(0, 8).map((p, i) => (
                  <tr key={i} className="border-t border-white/8">
                    <td className="px-3 py-1.5">{String(p.name)}</td>
                    <td className="px-3 py-1.5 text-mist">{parsed.kind === "linkedin" ? circle : String(p.circle || "")}</td>
                    <td className="px-3 py-1.5 text-mist">{String(p.role || "")}</td>
                    <td className="px-3 py-1.5 text-mist">{String(p.org || "")}</td>
                    <td className="px-3 py-1.5 text-mist">{String(p.city || "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.people.length > 8 && <p className="border-t border-white/8 px-3 py-2 text-xs text-dim">and {parsed.people.length - 8} more</p>}
          </div>
          <p className="text-xs text-dim">People already in your map are matched by name and updated instead of duplicated.</p>
          <div className="flex gap-2">
            <button
              className="btn btn-spore"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const people = parsed.kind === "linkedin" ? parsed.people.map((p) => ({ ...p, circle })) : parsed.people;
                  return summary(await postBulk(people, parsed.links));
                })
              }
            >
              {busy ? "Importing" : `Import ${parsed.people.length} people`}
            </button>
            <button className="btn btn-ghost" onClick={() => setParsed(null)}>
              Choose another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
