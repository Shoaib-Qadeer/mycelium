import { getDb } from "./mongo";

/**
 * App-wide settings stored in MongoDB (collection "settings", document "app"), editable in the admin panel.
 * Secrets (API keys, database URI) stay in environment variables.
 */

import { FEATURE_KEYS, type FeatureKey } from "./feature-info";
export { FEATURE_KEYS, FEATURE_INFO, type FeatureKey } from "./feature-info";

export type AppSettings = {
  features: Record<FeatureKey, boolean>;
  privacy: {
    /** Show organizations (e.g. "at UNESCO") on name-free club cards. */
    showOrgInClub: boolean;
  };
  access: {
    /** Let everyone at the allowed domains sign in. Off = only admins and the guest list. */
    domainOpen: boolean;
    /** New sign-ups wait in Members until an admin approves them. Guests on the list skip the wait. */
    requireApproval: boolean;
  };
  ai: {
    enabled: boolean;
    /** Overrides GEMINI_MODEL when set. */
    model: string;
    temperature: number;
    dailyCallLimit: number;
    perMemberDailyLimit: number;
    /** Extra guidance appended to the built-in prompts; empty = none. */
    describeGuidance: string;
    searchGuidance: string;
  };
  banner: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  features: { describe: true, import: true, quickAdd: true, export: true, health: true, club: true, clubSearch: true, intros: true },
  privacy: { showOrgInClub: true },
  access: { domainOpen: true, requireApproval: false },
  ai: {
    enabled: true,
    model: "",
    temperature: 0.2,
    dailyCallLimit: 400,
    perMemberDailyLimit: 30,
    describeGuidance: "",
    searchGuidance: "",
  },
  banner: "",
};

const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const num = (v: unknown, d: number, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
const str = (v: unknown, d: string, max: number) => (typeof v === "string" ? v.slice(0, max) : d);

/** Merges stored values over defaults and clamps everything to safe ranges. */
export function sanitize(input: unknown): AppSettings {
  const s = (input && typeof input === "object" ? input : {}) as Partial<Record<keyof AppSettings, Record<string, unknown>>> & { banner?: unknown };
  const D = DEFAULT_SETTINGS;
  const f = (s.features || {}) as Record<string, unknown>;
  const p = (s.privacy || {}) as Record<string, unknown>;
  const a = (s.access || {}) as Record<string, unknown>;
  const ai = (s.ai || {}) as Record<string, unknown>;
  return {
    features: Object.fromEntries(FEATURE_KEYS.map((k) => [k, bool(f[k], D.features[k])])) as AppSettings["features"],
    privacy: { showOrgInClub: bool(p.showOrgInClub, D.privacy.showOrgInClub) },
    access: { domainOpen: bool(a.domainOpen, D.access.domainOpen), requireApproval: bool(a.requireApproval, D.access.requireApproval) },
    ai: {
      enabled: bool(ai.enabled, D.ai.enabled),
      model: str(ai.model, D.ai.model, 80).trim(),
      temperature: num(ai.temperature, D.ai.temperature, 0, 1),
      dailyCallLimit: Math.round(num(ai.dailyCallLimit, D.ai.dailyCallLimit, 0, 100000)),
      perMemberDailyLimit: Math.round(num(ai.perMemberDailyLimit, D.ai.perMemberDailyLimit, 0, 1000)),
      describeGuidance: str(ai.describeGuidance, "", 4000),
      searchGuidance: str(ai.searchGuidance, "", 4000),
    },
    banner: str(s.banner, "", 280).trim(),
  };
}

let cache: { at: number; value: AppSettings } | null = null;

export async function getSettings(fresh = false): Promise<AppSettings> {
  if (!fresh && cache && Date.now() - cache.at < 10_000) return cache.value;
  try {
    const db = await getDb();
    const doc = await db.collection<{ _id: string; value: unknown }>("settings").findOne({ _id: "app" });
    const value = sanitize(doc?.value);
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(value: unknown, by: string): Promise<AppSettings> {
  const clean = sanitize(value);
  const db = await getDb();
  await db
    .collection<{ _id: string; value: unknown }>("settings")
    .updateOne({ _id: "app" }, { $set: { value: clean, updatedAt: new Date(), updatedBy: by } }, { upsert: true });
  cache = { at: Date.now(), value: clean };
  return clean;
}

/** Effective feature switches: Club off turns its children off too, AI off turns off Describe. */
export function effectiveFeatures(s: AppSettings, aiKey = Boolean(process.env.GEMINI_API_KEY)) {
  const f = { ...s.features };
  if (!f.club) f.clubSearch = f.intros = false;
  if (!s.ai.enabled || !aiKey) f.describe = false;
  return f;
}
