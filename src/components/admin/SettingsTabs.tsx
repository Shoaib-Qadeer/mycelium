"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { FEATURE_INFO, FEATURE_KEYS } from "@/lib/feature-info";
import type { AppSettings } from "@/lib/settings";
import { SaveBar, Section, Toggle, useSettingsDraft, ago } from "./ui";
import { UsageBars, type Overview } from "./OverviewTab";

const Loading = () => <p className="text-mist">Loading settings</p>;

export function FeaturesTab({ onSaved }: { onSaved: () => void }) {
  const s = useSettingsDraft();
  if (!s.draft) return <Loading />;
  const d = s.draft;
  const setFeature = (k: keyof AppSettings["features"], v: boolean) => s.setDraft({ ...d, features: { ...d.features, [k]: v } });
  const group = (g: "Map" | "Club") => FEATURE_KEYS.filter((k) => FEATURE_INFO[k].group === g);
  const noteFor = (k: (typeof FEATURE_KEYS)[number]) => {
    if ((k === "clubSearch" || k === "intros") && !d.features.club) return "Off while Club reach is off.";
    if (k === "describe" && !d.ai.enabled) return "Off while AI is switched off (AI tab).";
    return undefined;
  };
  return (
    <div className="space-y-5">
      <Section title="My map" description="What members can do with their own map.">
        <div className="divide-y divide-white/8">
          {group("Map").map((k) => (
            <Toggle key={k} checked={d.features[k]} onChange={(v) => setFeature(k, v)} label={FEATURE_INFO[k].label} description={FEATURE_INFO[k].description} note={noteFor(k)} />
          ))}
        </div>
      </Section>
      <Section title="Club" description="The shared, name-free layer across everyone's maps.">
        <div className="divide-y divide-white/8">
          {group("Club").map((k) => (
            <Toggle key={k} checked={d.features[k]} onChange={(v) => setFeature(k, v)} label={FEATURE_INFO[k].label} description={FEATURE_INFO[k].description} note={noteFor(k)} />
          ))}
          <Toggle
            checked={d.privacy.showOrgInClub}
            onChange={(v) => s.setDraft({ ...d, privacy: { ...d.privacy, showOrgInClub: v } })}
            label="Show organizations on club cards"
            description="On: “Researcher at UNESCO, Paris”. Off: “Researcher, Paris”. Names, notes and emails are never shown either way."
          />
        </div>
      </Section>
      <Section title="Announcement" description="A short line shown in everyone's top bar on wide screens. Leave empty to hide it.">
        <input
          className="field"
          maxLength={280}
          value={d.banner}
          onChange={(e) => s.setDraft({ ...d, banner: e.target.value })}
          placeholder="Map 10 people before Thursday's SEC meeting"
          aria-label="Announcement"
        />
      </Section>
      <SaveBar dirty={s.dirty} saving={s.saving} error={s.error} onReset={s.reset} onSave={async () => (await s.save(), onSaved())} />
    </div>
  );
}

export function AccessTab({ onSaved }: { onSaved: () => void }) {
  const s = useSettingsDraft();
  const [guests, setGuests] = useState<{ email: string; addedBy: string; addedAt: string }[] | null>(null);
  const [emails, setEmails] = useState("");
  const [err, setErr] = useState("");

  const loadGuests = useCallback(async () => {
    const j = await (await fetch("/api/admin/guests")).json();
    setGuests(j.guests);
  }, []);
  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  if (!s.draft) return <Loading />;
  const d = s.draft;
  const setAccess = (patch: Partial<AppSettings["access"]>) => s.setDraft({ ...d, access: { ...d.access, ...patch } });

  const add = async () => {
    setErr("");
    const r = await fetch("/api/admin/guests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emails }) });
    if (!r.ok) return setErr((await r.json()).error);
    setEmails("");
    loadGuests();
    onSaved();
  };

  return (
    <div className="space-y-5">
      <Section title="Who can sign in">
        <div className="divide-y divide-white/8">
          <Toggle
            checked={d.access.domainOpen}
            onChange={(v) => setAccess({ domainOpen: v })}
            label={`Everyone at ${s.meta.domains.map((x) => "@" + x).join(", ")}`}
            description="Off: only admins and the guests below can sign in. Existing members from the domain are locked out too."
          />
          <Toggle
            checked={d.access.requireApproval}
            onChange={(v) => setAccess({ requireApproval: v })}
            label="New members wait for approval"
            description="New sign-ups land in Members as waiting until you approve them. Guests on the list below skip the wait."
          />
        </div>
      </Section>

      <Section title="Guests" description="People outside the domain who may sign in with this exact Google account. Adding someone who is waiting also approves them.">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="field"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && emails.trim() && add()}
            placeholder="friend@gmail.com, another@uni.edu"
            aria-label="Guest emails"
          />
          <button className="btn btn-spore" onClick={add} disabled={!emails.trim()}>
            Add guests
          </button>
        </div>
        {err && <p className="mt-2 text-sm text-rose">{err}</p>}
        <ul className="mt-4 divide-y divide-white/8 rounded-xl border border-white/10">
          {guests?.map((g) => (
            <li key={g.email} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
              <span className="min-w-0 truncate">
                {g.email}
                <span className="ml-2 text-xs text-dim">added {ago(g.addedAt)}</span>
              </span>
              <button
                className="btn btn-quiet"
                aria-label={`Remove ${g.email}`}
                onClick={async () => {
                  await fetch("/api/admin/guests", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: g.email }) });
                  loadGuests();
                }}
              >
                <X size={15} /> Remove
              </button>
            </li>
          ))}
          {guests && guests.length === 0 && <li className="px-4 py-2.5 text-sm text-dim">No guests yet.</li>}
        </ul>
      </Section>

      <Section title="Admins" description="Set with ADMIN_EMAILS in Vercel. Admins always have access and see this panel.">
        <ul className="space-y-1 text-sm">
          {s.meta.admins.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </Section>
      <SaveBar dirty={s.dirty} saving={s.saving} error={s.error} onReset={s.reset} onSave={async () => (await s.save(), onSaved())} />
    </div>
  );
}

function NumberField({ id, label, hint, value, min, max, step = 1, onChange }: { id: string; label: string; hint?: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label htmlFor={id} className="lbl">
        {label} {hint && <span className="text-dim">({hint})</span>}
      </label>
      <input id={id} type="number" className="field" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function AiTab({ overview, onSaved }: { overview: Overview | null; onSaved: () => void }) {
  const s = useSettingsDraft();
  if (!s.draft) return <Loading />;
  const d = s.draft;
  const setAi = (patch: Partial<AppSettings["ai"]>) => s.setDraft({ ...d, ai: { ...d.ai, ...patch } });
  return (
    <div className="space-y-5">
      <Section title="AI">
        <Toggle
          checked={d.ai.enabled}
          onChange={(v) => setAi({ enabled: v })}
          label="AI switched on"
          description="Powers Describe and the club search. When off, Describe is hidden and club search falls back to keyword matching."
          note={overview && !overview.ai.keyConfigured ? "GEMINI_API_KEY is missing in Vercel, so AI can't run yet." : undefined}
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="lbl" htmlFor="ai-model">
              Model <span className="text-dim">(empty = {overview?.ai.model && !d.ai.model ? overview.ai.model : "GEMINI_MODEL"})</span>
            </label>
            <input id="ai-model" className="field" value={d.ai.model} onChange={(e) => setAi({ model: e.target.value })} placeholder="gemini-2.5-flash-lite" />
          </div>
          <NumberField id="ai-temp" label="Temperature" hint="0 = consistent" value={d.ai.temperature} min={0} max={1} step={0.05} onChange={(v) => setAi({ temperature: v })} />
          <NumberField id="ai-day" label="AI calls per day, whole club" value={d.ai.dailyCallLimit} min={0} max={100000} onChange={(v) => setAi({ dailyCallLimit: v })} />
          <NumberField id="ai-member" label="AI calls per day, per member" value={d.ai.perMemberDailyLimit} min={0} max={1000} onChange={(v) => setAi({ perMemberDailyLimit: v })} />
        </div>
      </Section>
      <Section title="Prompt guidance" description="Added to the built-in prompts. Use it to steer the AI without changing code, for example how to name circles or what counts as a good match.">
        <div className="space-y-4">
          <div>
            <label className="lbl" htmlFor="g-describe">Describe people</label>
            <textarea id="g-describe" className="field min-h-24" value={d.ai.describeGuidance} onChange={(e) => setAi({ describeGuidance: e.target.value })} placeholder='Use "LPI" as the circle for anyone from Learning Planet Institute.' />
          </div>
          <div>
            <label className="lbl" htmlFor="g-search">Who are you trying to reach?</label>
            <textarea id="g-search" className="field min-h-24" value={d.ai.searchGuidance} onChange={(e) => setAi({ searchGuidance: e.target.value })} placeholder="Prefer people the member knows well." />
          </div>
        </div>
      </Section>
      {overview && (
        <Section title="Usage" description={`${overview.ai.usage.at(-1)?.calls ?? 0} calls today. Last 14 days below; red is failed calls.`}>
          <UsageBars usage={overview.ai.usage} />
          <h3 className="mt-6 mb-2 text-sm text-mist">Recent calls</h3>
          {overview.ai.log.length === 0 ? (
            <p className="text-sm text-dim">No AI calls yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-dim">
                  <tr>
                    {["When", "Member", "Feature", "Tokens", "Time", "Result"].map((h) => (
                      <th key={h} className="py-1.5 pr-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overview.ai.log.map((l, i) => (
                    <tr key={i} className="border-t border-white/8">
                      <td className="py-1.5 pr-3 whitespace-nowrap text-mist">{ago(l.at)}</td>
                      <td className="max-w-[12rem] truncate py-1.5 pr-3">{l.user}</td>
                      <td className="py-1.5 pr-3 text-mist">{l.kind === "describe" ? "Describe" : "Club search"}</td>
                      <td className="py-1.5 pr-3 text-mist">{l.tokens.toLocaleString()}</td>
                      <td className="py-1.5 pr-3 text-mist">{(l.ms / 1000).toFixed(1)}s</td>
                      <td className="py-1.5">{l.ok ? <span className="text-moss">OK</span> : <span className="text-rose" title={l.error}>{l.error.slice(0, 60) || "Failed"}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}
      <SaveBar dirty={s.dirty} saving={s.saving} error={s.error} onReset={s.reset} onSave={async () => (await s.save(), onSaved())} />
    </div>
  );
}
