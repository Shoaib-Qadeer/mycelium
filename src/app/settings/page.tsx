"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Download, LogOut, Monitor, Moon, Sun, Trash2 } from "lucide-react";
import Nav from "@/components/Nav";
import Modal from "@/components/Modal";
import { useMe } from "@/app/providers";
import { applyTheme, readThemePref, type ThemePref } from "@/lib/theme";
import { download, exportCsv } from "@/lib/csv";

const THEMES: { id: ThemePref; label: string; note: string; icon: React.ReactNode; swatch: string[] }[] = [
  { id: "dark", label: "Night", note: "Glowing threads on a deep night sky", icon: <Moon size={16} />, swatch: ["#090d22", "#161d40", "#7fd6e8", "#f2c46d"] },
  { id: "light", label: "Daylight", note: "The same map on a pale morning sky", icon: <Sun size={16} />, swatch: ["#eef1f8", "#ffffff", "#13809a", "#f2c46d"] },
  { id: "system", label: "Match my device", note: "Follows your system's light or dark setting", icon: <Monitor size={16} />, swatch: ["#090d22", "#eef1f8", "#7fd6e8", "#f2c46d"] },
];

export default function SettingsPage() {
  const { me } = useMe();
  const [theme, setTheme] = useState<ThemePref>("dark");
  const [stats, setStats] = useState<{ people: number; links: number; intros: number; joined: string | null } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setTheme(readThemePref());
    fetch("/api/account")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats);
  }, []);

  const pick = (t: ThemePref) => {
    setTheme(t);
    applyTheme(t);
  };

  const downloadMap = async () => {
    const r = await fetch("/api/people");
    if (!r.ok) return;
    const j = await r.json();
    download("my-mycelium-map.csv", exportCsv(j.people, j.links));
  };

  return (
    <div className="min-h-screen pb-16">
      <Nav />
      <main className="mx-auto max-w-2xl px-5 pt-10">
        <h1 className="display text-4xl font-light">Settings</h1>

        <section className="panel mt-8 flex flex-wrap items-center gap-4 p-5">
          {me?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.image} alt="" className="h-12 w-12 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg">{me?.name?.[0]}</span>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-medium">{me?.name}</div>
            <div className="truncate text-sm text-dim">{me?.email}</div>
            {stats && (
              <div className="mt-0.5 text-xs text-dim">
                {stats.people} people and {stats.links} connections in your map
                {stats.joined ? `, member since ${new Date(stats.joined).toLocaleDateString(undefined, { month: "long", year: "numeric" })}` : ""}
              </div>
            )}
          </div>
          <button className="btn btn-ghost" onClick={() => signOut({ callbackUrl: "/" })}>
            <LogOut size={15} /> Sign out
          </button>
        </section>

        <section className="mt-10">
          <h2 className="display text-2xl">Appearance</h2>
          <p className="mt-1 text-sm text-mist">Saved on this device.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
            {THEMES.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={theme === t.id}
                onClick={() => pick(t.id)}
                className={`panel p-4 text-left transition-colors ${theme === t.id ? "!border-spore" : "hover:!border-white/25"}`}
              >
                <span className="flex gap-1">
                  {t.swatch.map((c, i) => (
                    <span key={i} className="h-5 w-5 rounded-full border border-white/15" style={{ background: c }} />
                  ))}
                </span>
                <span className="mt-3 flex items-center gap-1.5 font-medium">
                  {t.icon} {t.label}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-mist">{t.note}</span>
              </button>
            ))}
          </div>
        </section>

        {(me?.features.export ?? true) && (
          <section className="mt-10">
            <h2 className="display text-2xl">Your data</h2>
            <p className="mt-1 text-sm text-mist">Download your whole map as a CSV. You can import it again later, here or anywhere else.</p>
            <button className="btn btn-ghost mt-4" onClick={downloadMap}>
              <Download size={15} /> Download my map
            </button>
          </section>
        )}

        <section className="mt-10 rounded-2xl border border-rose/30 bg-rose/5 p-5">
          <h2 className="display text-2xl">Delete my account</h2>
          <p className="mt-1 text-sm leading-relaxed text-mist">
            Removes your account, your whole map, and every introduction you asked for or were asked about. Other members
            keep their own maps, including anyone they added who happens to be you.
          </p>
          {me?.isAdmin ? (
            <p className="mt-3 text-sm text-dim">Admin accounts are set in Vercel. Remove yourself from ADMIN_EMAILS first to delete this account.</p>
          ) : (
            <button className="btn mt-4 border border-rose/50 text-rose hover:bg-rose/10" onClick={() => setDeleting(true)}>
              <Trash2 size={15} /> Delete my account
            </button>
          )}
        </section>
      </main>

      {deleting && <DeleteAccount stats={stats} onClose={() => setDeleting(false)} />}
    </div>
  );
}

function DeleteAccount({ stats, onClose }: { stats: { people: number; links: number; intros: number } | null; onClose: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <Modal title="Delete your account?" onClose={onClose}>
      <p className="text-sm leading-relaxed text-mist">
        {stats
          ? `This permanently deletes your map of ${stats.people} people, ${stats.links} connections and ${stats.intros} introduction requests.`
          : "This permanently deletes your map, connections and introduction requests."}{" "}
        It can&apos;t be undone. Download your map first if you might want it later.
      </p>
      <input className="field mt-4" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type DELETE" aria-label="Type DELETE to confirm" />
      {err && <p className="mt-2 text-sm text-rose">{err}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn btn-quiet" onClick={onClose}>
          Keep my account
        </button>
        <button
          className="btn bg-rose text-[#2a0510]"
          disabled={text !== "DELETE" || busy}
          onClick={async () => {
            setBusy(true);
            const r = await fetch("/api/account", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ confirm: text }),
            });
            if (!r.ok) {
              setBusy(false);
              return setErr((await r.json()).error || "Couldn't delete the account.");
            }
            signOut({ callbackUrl: "/" });
          }}
        >
          {busy ? "Deleting" : "Delete my account"}
        </button>
      </div>
    </Modal>
  );
}
