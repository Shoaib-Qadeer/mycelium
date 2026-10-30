"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "@/lib/settings";

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  note,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <label className={`flex items-start gap-4 py-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-sm leading-relaxed text-mist">{description}</span>}
        {note && <span className="mt-1 block text-xs text-rose">{note}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors ${
          checked ? "border-spore/70 bg-spore/80" : "border-white/15 bg-white/8"
        }`}
      >
        <span
          className={`absolute top-0.5 h-[18px] w-[18px] rounded-full transition-all ${
            checked ? "left-[22px] bg-[#2a1d05]" : "left-0.5 bg-mist"
          }`}
        />
      </button>
    </label>
  );
}

export function Stat({
  label,
  value,
  tone,
  onClick,
}: {
  label: string;
  value: number | string | undefined;
  tone?: "spore" | "rose" | "moss";
  onClick?: () => void;
}) {
  const color = tone === "spore" ? "text-spore" : tone === "rose" ? "text-rose" : tone === "moss" ? "text-moss" : "";
  const inner = (
    <>
      <div className={`display text-3xl ${color}`}>{value ?? "–"}</div>
      <div className="mt-0.5 text-xs text-dim">{label}</div>
    </>
  );
  return onClick ? (
    <button onClick={onClick} className="panel p-4 text-left transition-colors hover:border-white/25">
      {inner}
    </button>
  ) : (
    <div className="panel p-4">{inner}</div>
  );
}

export function Meter({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const color = pct > 85 ? "#F29BB2" : pct > 60 ? "#F2C46D" : "#A8E39A";
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-mist">{label}</span>
        <span className="text-dim">{Math.round(pct)}%</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-white/6">
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
    </div>
  );
}

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="display text-xl">{title}</h2>
      {description && <p className="mt-1 text-sm leading-relaxed text-mist">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function useSettingsDraft() {
  const [saved, setSaved] = useState<AppSettings | null>(null);
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [meta, setMeta] = useState<{ domains: string[]; admins: string[] }>({ domains: [], admins: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((j) => {
        setSaved(j.settings);
        setDraft(j.settings);
        setMeta({ domains: j.domains, admins: j.admins });
      });
  }, []);

  const save = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: draft }),
    });
    const j = await res.json();
    setSaving(false);
    if (!res.ok) return setError(j.error || "Couldn't save.");
    setSaved(j.settings);
    setDraft(j.settings);
  }, [draft]);

  const dirty = Boolean(saved && draft && JSON.stringify(saved) !== JSON.stringify(draft));
  return { draft, setDraft, dirty, save, saving, error, reset: () => setDraft(saved), meta };
}

export function SaveBar({
  dirty,
  saving,
  onSave,
  onReset,
  error,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
  error?: string;
}) {
  if (!dirty && !error) return null;
  return (
    <div className="panel sticky bottom-4 z-20 mt-6 flex flex-wrap items-center gap-3 px-4 py-3" style={{ background: "var(--panel-solid)" }}>
      <span className="flex-1 text-sm text-mist">{error ? <span className="text-rose">{error}</span> : "You have unsaved changes."}</span>
      <button className="btn btn-quiet" onClick={onReset} disabled={saving}>
        Discard
      </button>
      <button className="btn btn-spore" onClick={onSave} disabled={saving}>
        {saving ? "Saving" : "Save changes"}
      </button>
    </div>
  );
}

export const ago = (iso: string | null) => {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
