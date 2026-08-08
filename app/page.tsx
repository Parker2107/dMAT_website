"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthGate } from "@/components/AuthGate";
import { SeedBadge } from "@/components/SeedBadge";
import { DailyVolumeChart } from "@/components/charts/DailyVolumeChart";
import { StatTile } from "@/components/charts/StatTile";
import { SERIES_COLOUR } from "@/components/charts/palette";
import {
  fetchAttempts,
  fetchExamSessions,
  type AttemptRow,
  type ExamSessionRow,
} from "@/lib/attempts";
import { formatDuration, formatPercent, formatSeconds } from "@/lib/format";
import {
  DIFFICULTIES,
  EXAM_PACE_MS,
  TASK_LABELS,
  TASK_SLUGS,
  TASK_TYPES,
} from "@/lib/generators/types";
import { summarise, type Summary } from "@/lib/stats";

export default function DashboardPage() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}

/** How many rows the recent-questions list shows at once. */
const RECENT_LIMIT = 10;

function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [sessions, setSessions] = useState<ExamSessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recentFilter, setRecentFilter] = useState<"all" | "wrong">("all");

  useEffect(() => {
    let active = true;
    Promise.all([fetchAttempts(), fetchExamSessions(10)])
      .then(([rows, examSessions]) => {
        if (!active) return;
        setAttempts(rows);
        setSummary(summarise(rows));
        setSessions(examSessions);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border-2 border-red-400 bg-red-50 p-4">
        <p className="font-semibold">Could not load your stats</p>
        <p className="mt-1 font-mono text-sm">{error}</p>
        <p className="mt-2 text-sm">
          If this mentions a missing table, run{" "}
          <code className="font-mono">supabase/migrations/0001_init.sql</code> in
          the Supabase SQL editor.
        </p>
      </div>
    );
  }

  if (!summary) return <p className="text-sm text-zinc-500">Loading your stats…</p>;

  const wrongCount = attempts.filter((row) => !row.is_correct).length;
  const recentAttempts =
    recentFilter === "wrong"
      ? attempts.filter((row) => !row.is_correct)
      : attempts;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-zinc-600">
            {summary.overall.total} questions practised ·{" "}
            {formatPercent(summary.overall.correct, summary.overall.total)}{" "}
            accuracy overall
          </p>
        </div>
        <Link
          href="/practice"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Start practising
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {summary.byType.map((stats) => (
          <StatTile
            key={stats.taskType}
            label={TASK_LABELS[stats.taskType]}
            accent={SERIES_COLOUR[stats.taskType]}
            total={stats.total}
            correct={stats.correct}
            medianMs={stats.medianMs}
            unique={stats.unique}
          />
        ))}
      </section>

      <DailyVolumeChart daily={summary.daily} />

      <section className="overflow-x-auto rounded-lg border border-zinc-300 bg-white">
        <h2 className="px-4 pt-4 text-sm font-semibold text-zinc-700">
          Breakdown by difficulty
          <span className="ml-2 font-normal text-zinc-500">
            median time is compared against the 75 s exam pace
          </span>
        </h2>
        <table className="mt-2 w-full min-w-[640px] text-sm">
          <thead className="text-left text-zinc-500">
            <tr className="border-b border-zinc-200">
              <th className="px-4 py-2 font-medium">Task type</th>
              <th className="px-4 py-2 font-medium">Difficulty</th>
              <th className="px-4 py-2 text-right font-medium">Practised</th>
              <th className="px-4 py-2 text-right font-medium">Correct</th>
              <th className="px-4 py-2 text-right font-medium">Accuracy</th>
              <th className="px-4 py-2 text-right font-medium">Median time</th>
            </tr>
          </thead>
          <tbody>
            {TASK_TYPES.flatMap((taskType) => {
              const stats = summary.byType.find((s) => s.taskType === taskType)!;
              return DIFFICULTIES.map((difficulty, index) => {
                const bucket = stats.byDifficulty[difficulty];
                return (
                  <tr
                    key={`${taskType}-${difficulty}`}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-4 py-2">
                      {index === 0 && (
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{ background: SERIES_COLOUR[taskType] }}
                          />
                          {TASK_LABELS[taskType]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 capitalize">{difficulty}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {bucket.total}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {bucket.correct}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatPercent(bucket.correct, bucket.total)}
                    </td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums ${
                        bucket.total > 0 && bucket.medianMs > EXAM_PACE_MS
                          ? "text-amber-700"
                          : ""
                      }`}
                    >
                      {bucket.total === 0 ? "—" : formatSeconds(bucket.medianMs)}
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </section>

      {sessions.length > 0 && (
        <section className="overflow-x-auto rounded-lg border border-zinc-300 bg-white">
          <h2 className="px-4 pt-4 text-sm font-semibold text-zinc-700">
            Recent exam sets
          </h2>
          <table className="mt-2 w-full min-w-[520px] text-sm">
            <thead className="text-left text-zinc-500">
              <tr className="border-b border-zinc-200">
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Task type</th>
                <th className="px-4 py-2 font-medium">Difficulty</th>
                <th className="px-4 py-2 text-right font-medium">Score</th>
                <th className="px-4 py-2 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-2">
                    {new Date(session.started_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">{TASK_LABELS[session.task_type]}</td>
                  <td className="px-4 py-2 capitalize">{session.difficulty}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {session.correct_count ?? 0}/{session.total_questions}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {session.duration_ms ? formatDuration(session.duration_ms) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {attempts.length > 0 && (
        <section className="rounded-lg border border-zinc-300 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="text-sm font-semibold text-zinc-700">
              Recent questions
              <span className="ml-2 font-normal text-zinc-500">
                copy a seed to practise it again on /replay
              </span>
            </h2>
            <div className="ml-auto inline-flex rounded-md border border-zinc-300 p-0.5">
              {(
                [
                  ["all", "All", attempts.length],
                  ["wrong", "Wrong only", wrongCount],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRecentFilter(value)}
                  aria-pressed={recentFilter === value}
                  className={`rounded px-3 py-1 text-xs ${
                    recentFilter === value
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {label}{" "}
                  <span className="tabular-nums opacity-70">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {recentAttempts.length === 0 ? (
            <p className="py-2 text-sm text-zinc-500">
              No wrong answers yet — nothing to review.
            </p>
          ) : (
            <>
              <ul className="space-y-2">
                {recentAttempts.slice(0, RECENT_LIMIT).map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <span
                      className={
                        row.is_correct ? "text-emerald-700" : "text-red-600"
                      }
                    >
                      {row.is_correct ? "correct" : "wrong"}
                    </span>
                    <span className="text-zinc-600">
                      {TASK_LABELS[row.task_type]} · {row.difficulty}
                    </span>
                    <span className="tabular-nums text-zinc-500">
                      {formatSeconds(row.duration_ms)}
                    </span>
                    <SeedBadge seed={row.seed} compact />
                  </li>
                ))}
              </ul>
              {recentAttempts.length > RECENT_LIMIT && (
                <p className="mt-3 text-xs text-zinc-500">
                  Showing the {RECENT_LIMIT} most recent of{" "}
                  {recentAttempts.length}.
                </p>
              )}
            </>
          )}
        </section>
      )}

      {summary.overall.total === 0 && (
        <section className="rounded-lg border border-zinc-300 bg-white p-6 text-center">
          <p className="text-zinc-700">
            No questions practised yet. Pick a task type to begin.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {TASK_TYPES.map((taskType) => (
              <Link
                key={taskType}
                href={`/practice/${TASK_SLUGS[taskType]}`}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:border-zinc-500"
              >
                {TASK_LABELS[taskType]}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
