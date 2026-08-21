/**
 * Turning thrown values into something a user can act on.
 *
 * Supabase is the reason this file exists. `postgrest-js` rejects with a plain
 * `{ message, details, hint, code }` object rather than an `Error`, so the
 * obvious `cause instanceof Error ? cause.message : String(cause)` renders it
 * as "[object Object]" and throws away the only useful part.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

/** `message (code) — hint`, skipping whichever parts are absent. */
function assemble(
  message: string,
  code: string | null,
  hint: string | null,
): string {
  return `${message}${code ? ` (${code})` : ""}${hint ? ` — ${hint}` : ""}`;
}

/**
 * A single readable line for any thrown value: `Error`, a Supabase
 * `PostgrestError`, or something stranger.
 */
export function describeError(cause: unknown): string {
  if (typeof cause === "string" && cause.trim().length > 0) return cause.trim();

  if (cause instanceof Error) {
    const extra = isRecord(cause) ? stringField(cause, "code") : null;
    return assemble(cause.message || cause.name, extra, null);
  }

  if (isRecord(cause)) {
    const message =
      stringField(cause, "message") ??
      stringField(cause, "error_description") ??
      stringField(cause, "error");
    const code = stringField(cause, "code") ?? stringField(cause, "status");
    const hint = stringField(cause, "hint") ?? stringField(cause, "details");
    if (message) return assemble(message, code, hint);
    // No recognisable message: JSON is still infinitely better than
    // "[object Object]" when someone pastes the box into a bug report.
    try {
      return JSON.stringify(cause);
    } catch {
      return "Unknown error";
    }
  }

  return cause === undefined || cause === null ? "Unknown error" : String(cause);
}

/**
 * Errors that mean "the request did not land", as opposed to "the request
 * landed and the answer is no".
 *
 * Two of these bite on a cold page load: an access token that expired while
 * the tab was closed is refreshed in the background, and a sleeping Supabase
 * project takes a moment to wake. Both fail exactly once, which is why a
 * manual reload always appeared to fix the dashboard.
 */
const PERMANENT_CODES = new Set([
  "42P01", // undefined_table — the migration has not been run
  "42703", // undefined_column
  "42501", // RLS denied the write
  "PGRST204", // column not found in schema cache
  "PGRST205", // table not found in schema cache
  "PGRST202", // function not found in schema cache
]);

const TRANSIENT_CODES = new Set([
  "PGRST301", // JWT expired / not yet valid
  "401",
  "408",
  "429",
  "500",
  "502",
  "503",
  "504",
]);

const TRANSIENT_MESSAGE =
  /jwt|token|failed to fetch|fetch failed|network|load failed|timed? ?out|connection|unavailable|too many requests/i;

export function isTransientError(cause: unknown): boolean {
  const code = isRecord(cause)
    ? stringField(cause, "code") ?? stringField(cause, "status")
    : null;

  if (code && PERMANENT_CODES.has(code)) return false;
  if (code && TRANSIENT_CODES.has(code)) return true;

  const message = cause instanceof Error ? cause.message : describeError(cause);
  return TRANSIENT_MESSAGE.test(message);
}
