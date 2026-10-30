"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import HeroNetwork from "@/components/HeroNetwork";
import { Spore } from "@/components/Nav";

const HEADLINE = "The people you know, and the people they know.";

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
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(90deg, var(--deep) 0%, color-mix(in srgb, var(--deep) 70%, transparent) 42%, transparent 75%)" }}
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center gap-2">
          <Spore size={26} />
          <span className="display text-xl">Mycelium</span>
        </div>
        <div className="flex flex-1 flex-col justify-center py-16">
          <h1 className="display max-w-[15ch] text-5xl leading-[1.04] font-light sm:text-6xl md:text-7xl" aria-label={HEADLINE}>
            {HEADLINE.split(" ").map((word, i) => (
              <span key={i} aria-hidden className="rise inline-block" style={{ animationDelay: `${0.15 + i * 0.09}s` }}>
                {word}&nbsp;
              </span>
            ))}
          </h1>
          <p className="rise mt-6 max-w-[46ch] text-lg leading-relaxed text-mist" style={{ animationDelay: "1.1s" }}>
            Map your friendships as a living network, see where it is strong or fragile, and find warm introductions
            through friends instead of cold messages to strangers.
          </p>
          <div className="rise mt-9 flex flex-wrap items-center gap-4" style={{ animationDelay: "1.35s" }}>
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
          {POINTS.map((p, i) => (
            <div key={p.title} className="rise max-w-[34ch]" style={{ animationDelay: `${1.6 + i * 0.15}s` }}>
              <h2 className="display text-xl">{p.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-mist">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
