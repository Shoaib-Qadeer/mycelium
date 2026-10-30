import Link from "next/link";

export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-6 pb-20">
      <header className="mx-auto flex max-w-[68ch] items-center justify-between py-8">
        <Link href="/" className="display text-xl">
          Mycelium
        </Link>
        <nav className="flex gap-4 text-sm text-mist">
          <Link href="/privacy" className="hover:text-star">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-star">
            Terms
          </Link>
        </nav>
      </header>
      <main className="legal mx-auto">
        <h1 className="display text-4xl font-light text-star sm:text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-dim">Last updated {updated}</p>
        <div className="mt-10">{children}</div>
      </main>
    </div>
  );
}
