"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search, Trash2 } from "lucide-react";
import Papa from "papaparse";
import Modal from "../Modal";
import { download } from "@/lib/csv";
import { ago } from "./ui";

type Member = {
  email: string;
  name: string;
  image: string;
  status: "active" | "pending" | "blocked";
  isAdmin: boolean;
  isGuest: boolean;
  createdAt: string | null;
  lastSeen: string | null;
  people: number;
  links: number;
  introsSent: number;
  introsReceived: number;
};

const FILTERS = [
  { id: "pending", label: "Waiting" },
  { id: "active", label: "Active" },
  { id: "blocked", label: "Paused" },
  { id: "all", label: "All" },
] as const;

export default function MembersTab({ onChange }: { onChange: () => void }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [deleting, setDeleting] = useState<Member | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/members");
    const j = await r.json();
    setMembers(j.members);
    if (j.members.some((m: Member) => m.status === "pending")) setFilter((f) => (f === "all" ? "pending" : f));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { pending: 0, active: 0, blocked: 0, all: members?.length ?? 0 };
    for (const m of members || []) c[m.status]++;
    return c;
  }, [members]);

  const shown = (members || []).filter(
    (m) => (filter === "all" || m.status === filter) && `${m.name} ${m.email}`.toLowerCase().includes(q.trim().toLowerCase())
  );

  const setStatus = async (emails: string[], status: Member["status"], key: string) => {
    setBusy(key);
    await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails, status }),
    });
    setBusy("");
    await load();
    onChange();
  };

  const exportCsv = () =>
    download(
      "mycelium-members.csv",
      Papa.unparse(
        shown.map((m) => ({
          name: m.name,
          email: m.email,
          status: m.status,
          guest: m.isGuest ? "yes" : "",
          joined: m.createdAt?.slice(0, 10) || "",
          last_seen: m.lastSeen?.slice(0, 10) || "",
          people_mapped: m.people,
          connections: m.links,
          intros_sent: m.introsSent,
          intros_received: m.introsReceived,
        }))
      )
    );

  const pending = (members || []).filter((m) => m.status === "pending");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full border border-white/10 p-1 text-sm">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 ${filter === f.id ? "bg-white/12 text-star" : "text-mist hover:text-star"}`}
            >
              {f.label} <span className="text-dim">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <label className="field flex flex-1 items-center gap-2 !rounded-full !py-0 sm:max-w-xs">
          <Search size={15} className="text-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="w-full bg-transparent py-2 outline-none placeholder:text-dim" aria-label="Search members" />
        </label>
        {pending.length > 1 && (
          <button className="btn btn-spore" disabled={busy === "all"} onClick={() => setStatus(pending.map((m) => m.email), "active", "all")}>
            Approve all {pending.length}
          </button>
        )}
        <button className="btn btn-ghost" onClick={exportCsv} disabled={!shown.length}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      {!members ? (
        <p className="text-mist">Loading members</p>
      ) : shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-dim">{filter === "pending" ? "Nobody is waiting for approval." : "No members match."}</p>
      ) : (
        <ul className="panel divide-y divide-white/8 !rounded-2xl">
          {shown.map((m) => (
            <li key={m.email} className="flex flex-wrap items-center gap-3 px-4 py-3">
              {m.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.image} alt="" className="h-9 w-9 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm">{m.name[0]}</span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{m.name}</span>
                  {m.isAdmin && <span className="chip !text-spore">admin</span>}
                  {m.isGuest && <span className="chip !text-cyan">guest</span>}
                  {m.status === "pending" && <span className="chip !text-spore">waiting</span>}
                  {m.status === "blocked" && <span className="chip !text-rose">paused</span>}
                </div>
                <div className="truncate text-sm text-dim">{m.email}</div>
                <div className="mt-0.5 text-xs text-dim">
                  {m.people} people, {m.links} connections, {m.introsSent} intros asked, {m.introsReceived} received. Seen {ago(m.lastSeen)}
                </div>
              </div>
              {!m.isAdmin && (
                <div className="flex flex-wrap gap-1.5">
                  {m.status !== "active" && (
                    <button className="btn btn-spore !py-1.5" disabled={busy === m.email + "a"} onClick={() => setStatus([m.email], "active", m.email + "a")}>
                      {m.status === "pending" ? "Approve" : "Restore"}
                    </button>
                  )}
                  {m.status !== "blocked" && (
                    <button className="btn btn-ghost !py-1.5" disabled={busy === m.email + "b"} onClick={() => setStatus([m.email], "blocked", m.email + "b")}>
                      {m.status === "pending" ? "Decline" : "Pause access"}
                    </button>
                  )}
                  <button className="btn btn-quiet" aria-label={`Delete ${m.name}`} title="Delete member and their map" onClick={() => setDeleting(m)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {deleting && (
        <DeleteMember
          member={deleting}
          onClose={() => setDeleting(null)}
          onDone={async () => {
            setDeleting(null);
            await load();
            onChange();
          }}
        />
      )}
    </div>
  );
}

function DeleteMember({ member, onClose, onDone }: { member: Member; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <Modal title={`Delete ${member.name}?`} onClose={onClose}>
      <p className="text-sm leading-relaxed text-mist">
        This removes their account, their map of {member.people} people and {member.links} connections, and every intro request they sent or
        received. It can&apos;t be undone. To stop them signing in, pause their access instead.
      </p>
      <input className="field mt-4" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type DELETE" aria-label="Type DELETE to confirm" />
      {err && <p className="mt-2 text-sm text-rose">{err}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn btn-quiet" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn bg-rose text-[#2a0510]"
          disabled={text !== "DELETE" || busy}
          onClick={async () => {
            setBusy(true);
            const r = await fetch("/api/admin/members", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: member.email, confirm: text }),
            });
            setBusy(false);
            if (!r.ok) return setErr((await r.json()).error || "Couldn't delete.");
            onDone();
          }}
        >
          {busy ? "Deleting" : "Delete member"}
        </button>
      </div>
    </Modal>
  );
}
