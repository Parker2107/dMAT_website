"use client";

import { EXAM_PACE_MS } from "@/lib/generators/types";
import { formatDuration } from "@/lib/format";

interface Props {
  elapsedMs: number;
  running: boolean;
}

/**
 * Counts up for the current question. Turns amber once the exam pace of
 * 75 seconds per question (25 minutes for 20 questions) has been passed.
 */
export function QuestionTimer({ elapsedMs, running }: Props) {
  const overPace = elapsedMs > EXAM_PACE_MS;

  return (
    <div
      className={`flex items-baseline gap-2 rounded-md border px-3 py-1.5 font-mono tabular-nums ${
        overPace
          ? "border-amber-400 bg-amber-50 text-amber-800"
          : "border-zinc-300 bg-white text-zinc-800"
      }`}
      title={`Exam pace is ${EXAM_PACE_MS / 1000}s per question`}
      aria-live="off"
    >
      <span className="text-lg font-semibold">{formatDuration(elapsedMs)}</span>
      <span className="text-xs text-zinc-500">
        {running ? "running" : "stopped"}
      </span>
    </div>
  );
}
