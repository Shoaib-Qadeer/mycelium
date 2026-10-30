"use client";

import { SessionProvider } from "next-auth/react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type MeInfo = {
  email: string;
  name: string;
  image: string;
  isAdmin: boolean;
  pendingIntros: number;
  aiEnabled: boolean;
};

const MeCtx = createContext<{ me: MeInfo | null; refreshMe: () => void }>({ me: null, refreshMe: () => {} });
export const useMe = () => useContext(MeCtx);

function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeInfo | null>(null);
  const refreshMe = useCallback(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, []);
  useEffect(() => refreshMe(), [refreshMe]);
  return <MeCtx.Provider value={{ me, refreshMe }}>{children}</MeCtx.Provider>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MeProvider>{children}</MeProvider>
    </SessionProvider>
  );
}
