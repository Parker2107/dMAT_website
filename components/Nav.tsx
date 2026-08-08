"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/practice", label: "Practice" },
  { href: "/exam", label: "Exam" },
  { href: "/rules", label: "Rules" },
  { href: "/replay", label: "Replay" },
  { href: "/resources", label: "Official links" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) =>
      setEmail(session?.user?.email ?? null),
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await getSupabase().auth.signOut();
    router.push("/login");
  }

  return (
    <header className="border-b border-zinc-300 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          dMAT Trainer
        </Link>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "font-semibold text-zinc-900 underline underline-offset-4"
                    : "text-zinc-600 hover:text-zinc-900"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm text-zinc-500">
          {email && (
            <>
              <span className="hidden sm:inline">{email}</span>
              <button
                type="button"
                onClick={signOut}
                className="rounded border border-zinc-300 px-2 py-1 hover:border-zinc-500"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
