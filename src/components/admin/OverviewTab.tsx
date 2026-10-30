"use client";

import { AlertTriangle, UserCheck } from "lucide-react";
import { Meter, Section, Stat } from "./ui";

export type Overview = {
  counts: {
    active: number;
    pending: number;
    blocked: number;
    active7: number;
    people: number;
    hidden: number;
    links: number;
    introsPending: number;
    introsAccepted: number;
    introsDeclined: number;
  };
  storage: { usedBytes: number | null; limitBytes: number };
  ai: {
    keyConfigured: boolean;
    enabled: boolean;
    model: string;
    dailyCallLimit: number;
    usage: { day: string; calls: number; failed: number; tokens: number }[];
    log: { at: string; user: string; kind: string; model: string; ok: boolean; tokens: number; ms: number; error: string }[];
  };
};

export type AdminTab = "overview" | "members" | "access" | "features" | "ai";

export function UsageBars({ usage }: { usage: Overview["ai"]["usage"] }) {
  const max = Math.max(1, ...usage.map((u) => u.calls));
  return (
    <div>
      <div className="flex h-28 items-end gap-1.5">
        {usage.map((u) => (
          <div key={u.day} className="flex h-full flex-1 flex-col justify-end" title={`${u.day}: ${u.calls} calls, ${u.failed} failed, ${u.tokens.toLocaleString()} tokens`}>
            <div className="rounded-t-sm bg-cyan/70" style={{ height: `${(u.calls / max) * 100}%`, minHeight: u.calls ? 3 : 0 }} />
            {u.failed > 0 && <div className="bg-rose/80" style={{ height: `${(u.failed / max) * 100}%` }} />}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-dim">
        <span>{usage[0]?.day.slice(5)}</span>
        <span>today</span>
      </div>
    </div>
  );
}

export default function OverviewTab({ data, go }: { data: Overview | null; go: (t: AdminTab) => void }) {
  const c = data?.counts;
  const today = data?.ai.usage.at(-1);
  return (
    <div className="space-y-6">
      {c && c.pending > 0 && (
        <button onClick={() => go("members")} className="flex w-full items-center gap-3 rounded-2xl border border-spore/40 bg-spore/8 p-4 text-left">
          <UserCheck size={20} className="shrink-0 text-spore" />
          <span>
            <span className="font-medium">
              {c.pending} {c.pending === 1 ? "person is" : "people are"} waiting for approval.
            </span>{" "}
            <span className="text-mist">Review them in Members.</span>
          </span>
        </button>
      )}
      {data && !data.ai.keyConfigured && (
        <button onClick={() => go("ai")} className="flex w-full items-center gap-3 rounded-2xl border border-rose/40 bg-rose/8 p-4 text-left">
          <AlertTriangle size={20} className="shrink-0 text-rose" />
          <span>
            <span className="font-medium">GEMINI_API_KEY isn&apos;t set, so Describe is hidden and club search uses keywords.</span>{" "}
            <span className="text-mist">Add it in Vercel&apos;s environment variables.</span>
          </span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="active members" value={c?.active} onClick={() => go("members")} />
        <Stat label="waiting for approval" value={c?.pending} tone={c?.pending ? "spore" : undefined} onClick={() => go("members")} />
        <Stat label="seen this week" value={c?.active7} />
        <Stat label="paused" value={c?.blocked} tone={c?.blocked ? "rose" : undefined} onClick={() => go("members")} />
        <Stat label="people mapped" value={c?.people} />
        <Stat label="connections between them" value={c?.links} />
        <Stat label="kept out of club reach" value={c?.hidden} />
        <Stat label="intros made" value={c?.introsAccepted} tone="moss" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Introductions">
          <ul className="space-y-2 text-sm">
            {[
              { l: "Waiting for a reply", n: c?.introsPending ?? 0, color: "#F2C46D" },
              { l: "Introduced", n: c?.introsAccepted ?? 0, color: "#A8E39A" },
              { l: "Not this time", n: c?.introsDeclined ?? 0, color: "#6F78A8" },
            ].map((r) => {
              const total = (c?.introsPending ?? 0) + (c?.introsAccepted ?? 0) + (c?.introsDeclined ?? 0);
              return (
                <li key={r.l} className="flex items-center gap-3">
                  <span className="w-36 text-mist">{r.l}</span>
                  <span className="h-2 flex-1 rounded-full bg-white/6">
                    <span className="block h-2 rounded-full" style={{ width: `${total ? (r.n / total) * 100 : 0}%`, background: r.color }} />
                  </span>
                  <span className="w-8 text-right">{r.n}</span>
                </li>
              );
            })}
          </ul>
        </Section>
        <Section title="Budgets">
          <div className="space-y-4">
            {data?.storage.usedBytes != null && (
              <Meter
                label={`Database: ${(data.storage.usedBytes / 1048576).toFixed(1)} MB of ${data.storage.limitBytes / 1048576} MB (Atlas free tier)`}
                used={data.storage.usedBytes}
                limit={data.storage.limitBytes}
              />
            )}
            {data && (
              <Meter label={`AI calls today: ${today?.calls ?? 0} of ${data.ai.dailyCallLimit}`} used={today?.calls ?? 0} limit={data.ai.dailyCallLimit} />
            )}
          </div>
        </Section>
      </div>

      {data && (
        <Section title="AI calls, last 14 days" description={`${data.ai.enabled ? "On" : "Off"}, using ${data.ai.model}. Red shows failed calls.`}>
          <UsageBars usage={data.ai.usage} />
        </Section>
      )}
    </div>
  );
}
