"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, ShieldCheck } from "lucide-react";
import { useMe } from "@/app/providers";

export function Spore({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <radialGradient id="spore-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF3D1" />
          <stop offset="55%" stopColor="#F2C46D" />
          <stop offset="100%" stopColor="#F2C46D" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g stroke="#7FD6E8" strokeWidth="1.3" strokeLinecap="round" opacity="0.8" fill="none">
        <path d="M16 16 C 11 12, 8 9, 4 6" />
        <path d="M16 16 C 21 13, 24 8, 28 5" />
        <path d="M16 16 C 14 21, 10 25, 6 28" />
        <path d="M16 16 C 20 20, 25 22, 29 25" />
      </g>
      <circle cx="4" cy="6" r="1.8" fill="#F29BB2" />
      <circle cx="28" cy="5" r="1.8" fill="#A8E39A" />
      <circle cx="6" cy="28" r="1.8" fill="#B9A6FF" />
      <circle cx="29" cy="25" r="1.8" fill="#7FD6E8" />
      <circle cx="16" cy="16" r="6" fill="url(#spore-g)" />
    </svg>
  );
}

const LINKS = [
  { href: "/map", label: "My map" },
  { href: "/club", label: "Club reach" },
  { href: "/intros", label: "Intros" },
];

export default function Nav({ floating = false }: { floating?: boolean }) {
  const path = usePathname();
  const { me } = useMe();
  const links = LINKS.filter(
    (l) => !me || (l.href === "/club" ? me.features.club : l.href === "/intros" ? me.features.intros : true)
  );
  return (
    <header
      className={`${floating ? "absolute left-3 right-3 top-3 z-30" : "sticky top-3 z-30 mx-3"} panel flex items-center gap-2 px-3 py-2 sm:gap-4 sm:px-4`}
    >
      <Link href="/map" className="flex items-center gap-2 pr-1">
        <Spore />
        <span className="display hidden text-lg sm:inline">Mycelium</span>
      </Link>
      <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scroll-thin">
        {links.map((l) => {
          const active = path?.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`relative shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${
                active ? "bg-white/10 text-star" : "text-mist hover:text-star"
              }`}
            >
              {l.label}
              {l.href === "/intros" && me?.pendingIntros ? (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-spore px-1 text-[10px] font-bold text-[#2a1d05]">
                  {me.pendingIntros}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      {me?.banner && (
        <p className="hidden max-w-[34ch] truncate text-sm text-spore xl:block" title={me.banner}>
          {me.banner}
        </p>
      )}
      {me?.isAdmin && (
        <Link
          href="/admin"
          className={`btn !px-3 !py-1.5 ${path?.startsWith("/admin") ? "bg-spore text-[#2a1d05]" : "btn-ghost"}`}
          title="Admin panel"
        >
          <ShieldCheck size={15} />
          <span className="hidden sm:inline">Admin panel</span>
          {me.pendingMembers > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-bold text-[#2a0510]">
              {me.pendingMembers}
            </span>
          )}
        </Link>
      )}
      {me && (
        <div className="flex items-center gap-2">
          {me.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.image} alt="" className="h-7 w-7 rounded-full ring-1 ring-white/20" referrerPolicy="no-referrer" />
          ) : null}
          <button className="btn btn-quiet" onClick={() => signOut({ callbackUrl: "/" })} aria-label="Sign out" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      )}
    </header>
  );
}
