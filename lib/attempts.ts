"use client";

import type { Difficulty, TaskType } from "./generators/types";
import {
  enqueueAttempt,
  restoreQueuedAttempts,
  takeQueuedAttempts,
  type QueuedAttempt,
} from "./offlineQueue";
import { getSupabase } from "./supabase/client";

export interface AttemptRow {
  id: string;
  task_type: TaskType;
  difficulty: Difficulty;
  seed: string;
  is_correct: boolean;
  duration_ms: number;
  answer: unknown;
  session_id: string | null;
  is_replay: boolean;
  created_at: string;
}

export interface AttemptInput {
  taskType: TaskType;
  difficulty: Difficulty;
  seed: string;
  isCorrect: boolean;
  durationMs: number;
  answer: unknown;
  sessionId?: string | null;
  isReplay?: boolean;
}

function toRow(input: AttemptInput): QueuedAttempt {
  return {
    task_type: input.taskType,
    difficulty: input.difficulty,
    seed: input.seed,
    is_correct: input.isCorrect,
    duration_ms: Math.round(input.durationMs),
    answer: input.answer ?? null,
    session_id: input.sessionId ?? null,
    is_replay: input.isReplay ?? false,
    created_at: new Date().toISOString(),
  };
}

/**
 * Writes one attempt. If the write fails for any reason the row is buffered
 * locally rather than dropped -- an answered question is never silently lost.
 */
export async function recordAttempt(input: AttemptInput): Promise<void> {
  const row = toRow(input);
  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      enqueueAttempt(row);
      return;
    }
    const { error } = await supabase
      .from("attempts")
      .insert({ ...row, user_id: data.user.id });
    if (error) enqueueAttempt(row);
  } catch {
    enqueueAttempt(row);
  }
}

/** Pushes any buffered attempts up. Returns how many were written. */
export async function flushQueuedAttempts(): Promise<number> {
  const pending = takeQueuedAttempts();
  if (pending.length === 0) return 0;

  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      restoreQueuedAttempts(pending);
      return 0;
    }
    const { error } = await supabase
      .from("attempts")
      .insert(pending.map((row) => ({ ...row, user_id: data.user!.id })));
    if (error) {
      restoreQueuedAttempts(pending);
      return 0;
    }
    return pending.length;
  } catch {
    restoreQueuedAttempts(pending);
    return 0;
  }
}

export async function fetchAttempts(limit = 5000): Promise<AttemptRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("attempts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AttemptRow[];
}

/* ------------------------------------------------------------------ *
 * Exam sessions
 * ------------------------------------------------------------------ */

export interface ExamSessionRow {
  id: string;
  task_type: TaskType;
  difficulty: Difficulty | "mixed";
  total_questions: number;
  correct_count: number | null;
  duration_ms: number | null;
  started_at: string;
  finished_at: string | null;
}

export async function createExamSession(
  taskType: TaskType,
  difficulty: Difficulty | "mixed",
  totalQuestions: number,
): Promise<string | null> {
  try {
    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;
    const { data, error } = await supabase
      .from("exam_sessions")
      .insert({
        user_id: userData.user.id,
        task_type: taskType,
        difficulty,
        total_questions: totalQuestions,
      })
      .select("id")
      .single();
    if (error) return null;
    return data.id as string;
  } catch {
    return null;
  }
}

export async function finishExamSession(
  sessionId: string,
  correctCount: number,
  durationMs: number,
): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase
      .from("exam_sessions")
      .update({
        correct_count: correctCount,
        duration_ms: Math.round(durationMs),
        finished_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
  } catch {
    // The attempts themselves are already stored; a missing summary row is
    // recoverable and must never block the results page.
  }
}

export async function fetchExamSessions(limit = 50): Promise<ExamSessionRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("exam_sessions")
    .select("*")
    .not("finished_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ExamSessionRow[];
}
