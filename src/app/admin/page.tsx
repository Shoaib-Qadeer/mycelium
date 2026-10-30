"use client";

import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { useMe } from "@/app/providers";
import OverviewTab, { type AdminTab, type Overview } from "@/components/admin/OverviewTab";
import MembersTab from "@/components/admin/MembersTab";
import { AccessTab, AiTab, FeaturesTab } from "@/components/admin/SettingsTabs";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "members", label: "Members" },
  { id: "access", label: "Access" },
  { id: "features", label: "Features" },
  { id: "ai", label: "AI" },
];

export default function AdminPage() {
  const { me, refreshMe } = useMe();
  const [tab, setTabState] = useState<AdminTab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);

  const loadOverview = useCallback(async () => {
    const r = await fetch("/api/admin");
    if (r.ok) setOverview(await r.json());
  }, []);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab") as AdminTab | null;
    if (t && TABS.some((x) => x.id === t)) setTabState(t);
    loadOverview();
    const id = setInterval(loadOverview, 30_000);
    return () => clearInterval(id);
  }, [loadOverview]);

  const setTab = (t: AdminTab) => {
    setTabState(t);
    window.history.replaceState(null, "", t === "overview" ? "/admin" : `/admin?tab=${t}`);
  };
  const refresh = () => {
    loadOverview();
    refreshMe();
  };

  if (me && !me.isAdmin)
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-xl px-5 pt-16">
          <h1 className="display text-4xl font-light">Admins only</h1>
          <p className="mt-3 text-mist">This panel is for club admins.</p>
        </main>
      </div>
    );

  return (
    <div className="min-h-screen pb-16">
      <Nav />
      <main className="mx-auto max-w-4xl px-5 pt-10">
        <h1 className="display text-4xl font-light">Admin panel</h1>
        <p className="mt-2 max-w-[62ch] text-mist">
          Only admins see this page. Approve members, decide who can sign in, switch features on and off, and keep an eye on AI use.
        </p>
        <div className="mt-6 mb-8 flex gap-1 overflow-x-auto scroll-thin rounded-full border border-white/10 p-1 text-sm sm:inline-flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 whitespace-nowrap ${tab === t.id ? "bg-white/12 text-star" : "text-mist hover:text-star"}`}
            >
              {t.label}
              {t.id === "members" && overview?.counts.pending ? (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-spore-fill px-1 text-[10px] font-bold text-[#2a1d05]">
                  {overview.counts.pending}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        {tab === "overview" && <OverviewTab data={overview} go={setTab} />}
        {tab === "members" && <MembersTab onChange={refresh} />}
        {tab === "access" && <AccessTab onSaved={refresh} />}
        {tab === "features" && <FeaturesTab onSaved={refresh} />}
        {tab === "ai" && <AiTab overview={overview} onSaved={refresh} />}
      </main>
    </div>
  );
}
