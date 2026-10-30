"use client";

import { SessionProvider, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSystemThemeSync } from "@/lib/theme";

export type Features = {
  describe: boolean;
  import: boolean;
  quickAdd: boolean;
  export: boolean;
  health: boolean;
  club: boolean;
  clubSearch: boolean;
  intros: boolean;
};

export type MeInfo = {
  email: string;
  name: string;
  image: string;
  isAdmin: boolean;
  status: "active" | "pending" | "blocked";
  pendingIntros: number;
  pendingMembers: number;
  aiEnabled: boolean;
  features: Features;
  banner: string;
};

const MeCtx = createContext<{ me: MeInfo | null; refreshMe: () => void }>({ me: null, refreshMe: () => {} });
export const useMe = () => useContext(MeCtx);

function Waiting({ status }: { status: MeInfo["status"] }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="panel max-w-md p-8">
        <h1 className="display text-3xl">{status === "pending" ? "You're on the waiting list" : "Your access is paused"}</h1>
        <p className="mt-3 leading-relaxed text-mist">
          {status === "pending"
            ? "An admin approves new members by hand. You'll get in as soon as they do; just sign in again later."
            : "An admin has paused your access to Mycelium. Contact the club if you think this is a mistake."}
        </p>
        <button className="btn btn-ghost mt-6" onClick={() => signOut({ callbackUrl: "/" })}>
          Sign out
        </button>
      </div>
    </main>
  );
}

function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeInfo | null>(null);
  const path = usePathname();
  useSystemThemeSync();
  const refreshMe = useCallback(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, []);
  useEffect(() => refreshMe(), [refreshMe]);
  const gated = me && me.status !== "active" && path !== "/" && !["/denied", "/settings", "/privacy", "/terms"].some((x) => path?.startsWith(x));
  return <MeCtx.Provider value={{ me, refreshMe }}>{gated ? <Waiting status={me.status} /> : children}</MeCtx.Provider>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MeProvider>{children}</MeProvider>
    </SessionProvider>
  );
}
