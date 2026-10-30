"use client";

import { useState } from "react";
import Modal from "./Modal";
import type { BlindNode } from "@/lib/types";

export default function IntroModal({
  node,
  meEmail,
  onClose,
  onSent,
}: {
  node: BlindNode;
  meEmail: string;
  onClose: () => void;
  onSent: (msg: string) => void;
}) {
  const options = node.knownBy.filter((k) => k.email !== meEmail).sort((a, b) => b.closeness - a.closeness);
  const [via, setVia] = useState(options[0]?.email || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const viaName = options.find((o) => o.email === via)?.name.split(" ")[0] || "them";

  return (
    <Modal title="Ask for an introduction" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 p-4">
          <div className="font-medium">{node.label}</div>
          {node.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {node.tags.map((t) => (
                <span key={t} className="chip">{t}</span>
              ))}
            </div>
          )}
        </div>
        {options.length > 1 ? (
          <div>
            <span className="lbl">Who should introduce you?</span>
            <div className="space-y-1.5">
              {options.map((o) => (
                <label key={o.email} className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <input type="radio" name="via" className="accent-[#F2C46D]" checked={via === o.email} onChange={() => setVia(o.email)} />
                  {o.name}
                  <span className="text-dim">{o.closeness >= 4 ? "knows them well" : o.closeness >= 3 ? "knows them" : "knows them a little"}</span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-mist">
            {options[0]?.name} knows this person{options[0] && options[0].closeness >= 4 ? " well" : ""}.
          </p>
        )}
        <div>
          <label className="lbl" htmlFor="intro-msg">
            Your note to {viaName}
          </label>
          <textarea
            id="intro-msg"
            className="field min-h-32"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Who you are, why you'd like to meet them, and what you'd ask. A good note makes it easy to say yes."
          />
        </div>
        <p className="text-xs leading-relaxed text-dim">
          {viaName} sees your note and decides whether to make the introduction. You won&apos;t see this person&apos;s name unless they connect you.
        </p>
        {err && <p className="text-sm text-rose">{err}</p>}
        <button
          className="btn btn-spore"
          disabled={busy || !via || message.trim().length < 10}
          onClick={async () => {
            setBusy(true);
            setErr("");
            const res = await fetch("/api/intros", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nodeId: node.id, viaEmail: via, message }),
            });
            setBusy(false);
            const j = await res.json();
            if (!res.ok) return setErr(j.error || "Couldn't send the request.");
            onSent(`Request sent to ${viaName}`);
          }}
        >
          {busy ? "Sending" : `Send request to ${viaName}`}
        </button>
      </div>
    </Modal>
  );
}
