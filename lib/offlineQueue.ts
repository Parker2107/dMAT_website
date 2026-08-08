"use client";

const KEY = "dmat.pendingAttempts";

/**
 * Attempts that could not be written to Supabase (offline, flaky connection)
 * are buffered here and flushed on the next successful load, so a practice
 * session on the train is never lost.
 */
export interface QueuedAttempt {
  task_type: string;
  difficulty: string;
  seed: string;
  is_correct: boolean;
  duration_ms: number;
  answer: unknown;
  session_id: string | null;
  is_replay: boolean;
  created_at: string;
}

function read(): QueuedAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedAttempt[]) : [];
  } catch {
    return [];
  }
}

function write(rows: QueuedAttempt[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    // Storage full or blocked -- nothing useful to do here.
  }
}

export function enqueueAttempt(row: QueuedAttempt): void {
  const rows = read();
  rows.push(row);
  // Keep the buffer bounded so a long offline stretch cannot fill storage.
  write(rows.slice(-500));
}

export function takeQueuedAttempts(): QueuedAttempt[] {
  const rows = read();
  if (rows.length > 0) write([]);
  return rows;
}

export function queuedAttemptCount(): number {
  return read().length;
}

export function restoreQueuedAttempts(rows: QueuedAttempt[]): void {
  if (rows.length === 0) return;
  write([...rows, ...read()].slice(-500));
}
