"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { flushQueuedAttempts } from "@/lib/attempts";
import {
  getSupabase,
  isSupabaseConfigured,
  supabaseConfigError,
} from "@/lib/supabase/client";

type State = "loading" | "signed-in" | "signed-out" | "unconfigured";

/**
 * Wraps any page that needs a signed-in user. Also flushes attempts that were
 * buffered while offline, once a session is available.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(
    isSupabaseConfigured ? "loading" : "unconfigured",
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState(data.session ? "signed-in" : "signed-out");
      if (data.session) void flushQueuedAttempts();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session ? "signed-in" : "signed-out");
      if (session) void flushQueuedAttempts();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (state === "unconfigured") {
    return (
      <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-5 text-sm">
        <h2 className="mb-2 text-base font-semibold">Supabase is not configured</h2>
        {supabaseConfigError && (
          <p className="mb-3 rounded border border-amber-300 bg-white px-3 py-2 font-mono text-xs">
            {supabaseConfigError}
          </p>
        )}
        <p className="mb-2">
          Create <code className="font-mono">.env.local</code> with your project
          credentials, then restart the dev server:
        </p>
        <pre className="overflow-x-auto rounded bg-white p-3 font-mono text-xs">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...`}
        </pre>
        <p className="mt-2">
          See <code className="font-mono">README.md</code> for the full setup,
          including the SQL migration.
        </p>
      </div>
    );
  }

  if (state === "loading") {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (state === "signed-out") {
    return (
      <div className="rounded-lg border border-zinc-300 bg-white p-5">
        <p className="mb-3">You need to sign in to track your practice.</p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
