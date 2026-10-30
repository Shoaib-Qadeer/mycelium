"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import HeroNetwork from "@/components/HeroNetwork";
import { Spore } from "@/components/Nav";

const POINTS = [
  {
    title: "Map it in minutes",
    body: "Import a spreadsheet or your LinkedIn export, or just describe people in your own words and let the AI sort them out.",
  },
  {
    title: "See its shape",
    body: "Find the friends who hold groups together, the close ties that are fading, and the fields where you only know one person.",
  },
  {
    title: "Meet through friends",
    body: "Club members see roles and places, never names. Every introduction goes through the friend who knows them, and only if they agree.",
  },
];

export default function Landing() {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === "authenticated") router.replace("/map");
  }, [status, router]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <HeroNetwork />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#090d22] via-[#090d22]/80 to-transparent md:via-[#090d22]/55" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center gap-2">
          <Spore size={26} />
          <span className="display text-xl">Mycelium</span>
        </div>
        <div className="flex flex-1 flex-col justify-center py-16">
          <h1 className="display max-w-[15ch] text-5xl leading-[1.04] font-light sm:text-6xl md:text-7xl">
            The people you know, and the people they know.
          </h1>
          <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-mist">
            Map your friendships as a living network, see where it is strong or fragile, and find warm introductions
            through friends instead of cold messages to strangers.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button
              className="btn btn-spore px-6 py-3 text-base"
              onClick={() => signIn("google", { callbackUrl: "/map" })}
              disabled={status === "loading"}
            >
              Sign in with Google
            </button>
            <span className="text-sm text-dim">For Learning Planet Institute accounts and invited guests.</span>
          </div>
        </div>
        <div className="grid gap-6 pb-4 sm:grid-cols-3 sm:gap-10">
          {POINTS.map((p) => (
            <div key={p.title} className="max-w-[34ch]">
              <h2 className="display text-xl">{p.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-mist">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
