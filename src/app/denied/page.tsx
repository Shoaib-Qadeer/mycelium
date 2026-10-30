"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Spore } from "@/components/Nav";

export default function Denied() {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => setBlocked(new URLSearchParams(window.location.search).get("reason") === "blocked"), []);
  if (blocked)
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="panel max-w-md p-8">
          <Spore size={30} />
          <h1 className="display mt-4 text-3xl">Your access is paused</h1>
          <p className="mt-3 leading-relaxed text-mist">An admin has paused this account. Contact the club if you think this is a mistake.</p>
          <Link href="/" className="btn btn-ghost mt-6">
            Back
          </Link>
        </div>
      </main>
    );
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="panel max-w-md p-8">
        <Spore size={30} />
        <h1 className="display mt-4 text-3xl">This account isn&apos;t on the list yet</h1>
        <p className="mt-3 leading-relaxed text-mist">
          Mycelium is open to Learning Planet Institute accounts. If you&apos;re a guest, ask a club admin to add your email,
          then sign in again with that same Google account.
        </p>
        <Link href="/" className="btn btn-ghost mt-6">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
