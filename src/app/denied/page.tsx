"use client";

import Link from "next/link";
import { Spore } from "@/components/Nav";

export default function Denied() {
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
