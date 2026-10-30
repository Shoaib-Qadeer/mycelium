"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import Nav from "@/components/Nav";

type AdminData = {
  domains: string[];
  admins: string[];
  allowlist: { email: string; addedBy: string; addedAt: string }[];
  users: { email: string; name: string; lastSeen: string; people: number }[];
};

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [denied, setDenied] = useState(false);
  const [emails, setEmails] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin");
    if (!res.ok) return setDenied(true);
    setData(await res.json());
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    setErr("");
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails }),
    });
    if (!res.ok) return setErr((await res.json()).error);
    setEmails("");
    load();
  };

  return (
    <div className="min-h-screen pb-16">
      <Nav />
      <main className="mx-auto max-w-3xl px-5 pt-10">
        <h1 className="display text-4xl font-light">Access</h1>
        {denied ? (
          <p className="mt-3 text-mist">Only admins can manage access.</p>
        ) : !data ? (
          <p className="mt-3 text-mist">Loading</p>
        ) : (
          <>
            <p className="mt-2 max-w-[60ch] text-mist">
              Anyone with an email at {data.domains.map((d) => `@${d}`).join(" or ")} can sign in. Add guests from other domains below.
            </p>

            <section className="mt-8">
              <h2 className="display text-2xl">Invite guests</h2>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  className="field"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder="friend@gmail.com, another@uni.edu"
                  aria-label="Emails to allow"
                  onKeyDown={(e) => e.key === "Enter" && add()}
                />
                <button className="btn btn-spore" onClick={add} disabled={!emails.trim()}>
                  Allow access
                </button>
              </div>
              {err && <p className="mt-2 text-sm text-rose">{err}</p>}
              <ul className="mt-4 divide-y divide-white/8 rounded-xl border border-white/10">
                {data.admins.map((a) => (
                  <li key={a} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    {a}
                    <span className="text-xs text-dim">admin, set in Vercel</span>
                  </li>
                ))}
                {data.allowlist.map((a) => (
                  <li key={a.email} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    {a.email}
                    <button
                      className="btn btn-quiet"
                      aria-label={`Remove ${a.email}`}
                      onClick={async () => {
                        await fetch("/api/admin", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: a.email }),
                        });
                        load();
                      }}
                    >
                      <X size={15} /> Remove
                    </button>
                  </li>
                ))}
                {data.allowlist.length === 0 && <li className="px-4 py-2.5 text-sm text-dim">No guests yet.</li>}
              </ul>
            </section>

            <section className="mt-10">
              <h2 className="display text-2xl">Members ({data.users.length})</h2>
              <ul className="mt-3 divide-y divide-white/8 rounded-xl border border-white/10">
                {data.users.map((u) => (
                  <li key={u.email} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <span>
                      {u.name} <span className="text-dim">{u.email}</span>
                    </span>
                    <span className="text-xs text-dim">{u.people} people mapped</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
