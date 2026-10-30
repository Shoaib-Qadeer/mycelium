"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useMe } from "@/app/providers";
import type { Intro } from "@/lib/types";

const STATUS: Record<Intro["status"], { label: string; cls: string }> = {
  pending: { label: "Waiting", cls: "text-spore" },
  accepted: { label: "Introduced", cls: "text-moss" },
  declined: { label: "Not this time", cls: "text-dim" },
};

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

export default function IntrosPage() {
  const { me, refreshMe } = useMe();
  const [data, setData] = useState<{ received: Intro[]; sent: Intro[] } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    fetch("/api/intros")
      .then((r) => r.json())
      .then(setData);
  }, []);
  useEffect(load, [load]);

  const answer = async (id: string, status: "accepted" | "declined") => {
    await fetch(`/api/intros/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, responseNote: notes[id] || "" }),
    });
    load();
    refreshMe();
  };

  return (
    <div className="min-h-screen pb-16">
      <Nav />
      <main className="mx-auto max-w-3xl px-5 pt-10">
        <h1 className="display text-4xl font-light">Introductions</h1>
        {me && !me.features.intros && (
          <p className="mt-3 rounded-xl border border-rose/25 bg-rose/5 px-4 py-3 text-sm text-mist">
            Introduction requests are switched off by the admin. You can still see past requests below.
          </p>
        )}
        <p className="mt-2 max-w-[60ch] text-mist">
          When someone in the club asks you to introduce them to a person in your map, it shows up here. You decide, and only
          you know who it is.
        </p>

        <section className="mt-10">
          <h2 className="display text-2xl">Asked of you</h2>
          {!data ? (
            <p className="mt-3 text-mist">Loading</p>
          ) : data.received.length === 0 ? (
            <p className="mt-3 text-sm text-dim">No requests yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.received.map((i) => (
                <li key={i._id} className="panel p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p>
                      <span className="font-medium">{i.fromName}</span>
                      <span className="text-mist"> would like to meet </span>
                      <span className="font-medium">{i.personName || i.personLabel}</span>
                    </p>
                    <span className={`text-sm ${STATUS[i.status].cls}`}>{STATUS[i.status].label}, {when(i.createdAt)}</span>
                  </div>
                  <blockquote className="mt-3 border-l-2 border-white/15 pl-3 text-sm leading-relaxed whitespace-pre-line text-mist">{i.message}</blockquote>
                  {i.status === "pending" ? (
                    <div className="mt-4 space-y-2">
                      <textarea
                        className="field min-h-16"
                        placeholder={`Optional reply to ${i.fromName.split(" ")[0]}, e.g. "I've emailed you both"`}
                        value={notes[i._id] || ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [i._id]: e.target.value }))}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button className="btn btn-spore" onClick={() => answer(i._id, "accepted")}>
                          I&apos;ll introduce them
                        </button>
                        <button className="btn btn-ghost" onClick={() => answer(i._id, "declined")}>
                          Not this time
                        </button>
                        <a className="btn btn-quiet" href={`mailto:${i.fromEmail}`}>
                          Email {i.fromName.split(" ")[0]}
                        </a>
                      </div>
                    </div>
                  ) : (
                    i.responseNote && <p className="mt-3 text-sm text-dim">Your reply: {i.responseNote}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12">
          <h2 className="display text-2xl">Your requests</h2>
          {data && data.sent.length === 0 && (
            <p className="mt-3 text-sm text-dim">
              You haven&apos;t asked for any yet. Find someone on <Link href="/club" className="text-cyan hover:underline">Club reach</Link>.
            </p>
          )}
          <ul className="mt-4 space-y-3">
            {data?.sent.map((i) => (
              <li key={i._id} className="rounded-2xl border border-white/10 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p>
                    <span className="text-mist">You asked </span>
                    <span className="font-medium">{i.toName}</span>
                    <span className="text-mist"> about </span>
                    <span className="font-medium">{i.personLabel}</span>
                  </p>
                  <span className={`text-sm ${STATUS[i.status].cls}`}>{STATUS[i.status].label}</span>
                </div>
                {i.responseNote && <p className="mt-2 text-sm text-mist">{i.toName.split(" ")[0]} replied: {i.responseNote}</p>}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
