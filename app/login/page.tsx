"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getSupabase,
  isSupabaseConfigured,
  supabaseConfigError,
} from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) router.replace("/");
      });
  }, [router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const supabase = getSupabase();
    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setBusy(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (mode === "sign-up" && !result.data.session) {
      setMessage(
        "Account created. Check your inbox to confirm the address, then sign in.",
      );
      return;
    }
    router.replace("/");
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-md rounded-lg border-2 border-amber-400 bg-amber-50 p-5 text-sm">
        <h1 className="mb-2 text-base font-semibold">Supabase is not configured</h1>
        {supabaseConfigError && (
          <p className="mb-3 rounded border border-amber-300 bg-white px-3 py-2 font-mono text-xs">
            {supabaseConfigError}
          </p>
        )}
        <p>
          Add <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
          <code className="font-mono">.env.local</code>, then restart the dev
          server. See <code className="font-mono">README.md</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-semibold">
        {mode === "sign-in" ? "Sign in" : "Create an account"}
      </h1>
      <p className="mb-5 text-sm text-zinc-600">
        Your practice counts and times sync across every device you sign in on.
      </p>

      <form onSubmit={submit} className="space-y-4 rounded-lg border border-zinc-300 bg-white p-5">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-blue-600"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-blue-600"
          />
        </label>

        {message && (
          <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Sign up"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setMessage(null);
          }}
          className="w-full text-sm text-blue-700 underline"
        >
          {mode === "sign-in"
            ? "No account yet? Create one"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
