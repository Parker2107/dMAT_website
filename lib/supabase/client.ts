"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Env values arrive as raw strings, so tolerate the usual copy-paste damage:
 * surrounding quotes and stray whitespace.
 */
function clean(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const anonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * A human-readable reason the client cannot be built, or null when everything
 * is in place. Checking the URL is genuinely parseable here means a typo shows
 * up as a setup message rather than an uncaught throw inside createClient.
 */
export const supabaseConfigError: string | null = (() => {
  if (!url) {
    return "NEXT_PUBLIC_SUPABASE_URL is not set.";
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return `NEXT_PUBLIC_SUPABASE_URL is not a valid URL (got "${url}"). It should look like https://abcdefghijkl.supabase.co — the https:// prefix is required.`;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return `NEXT_PUBLIC_SUPABASE_URL must start with https:// (got "${url}").`;
  }

  if (!anonKey) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.";
  }

  return null;
})();

/** True when the app has usable Supabase credentials. */
export const isSupabaseConfigured = supabaseConfigError === null;

let cached: SupabaseClient | null = null;

/**
 * Browser Supabase client. Sessions live in localStorage and refresh
 * themselves, so practice stats follow you across devices after a single
 * sign-in on each.
 */
export function getSupabase(): SupabaseClient {
  if (supabaseConfigError || !url || !anonKey) {
    throw new Error(
      `${supabaseConfigError ?? "Supabase is not configured."} Set it in .env.local and restart the dev server.`,
    );
  }
  cached ??= createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return cached;
}
