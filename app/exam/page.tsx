import Link from "next/link";

import {
  EXAM_QUESTION_COUNT,
  TASK_LABELS,
  TASK_SLUGS,
  TASK_TYPES,
} from "@/lib/generators/types";

export default function ExamIndexPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Timed exam sets</h1>
        <p className="text-sm text-zinc-600">
          {EXAM_QUESTION_COUNT} questions in 25 minutes, exactly like the real
          subtest. No feedback until you finish.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {TASK_TYPES.map((taskType) => (
          <Link
            key={taskType}
            href={`/exam/${TASK_SLUGS[taskType]}`}
            className="rounded-lg border border-zinc-300 bg-white p-4 hover:border-zinc-500"
          >
            <h2 className="font-semibold">{TASK_LABELS[taskType]}</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {EXAM_QUESTION_COUNT} questions · 25:00 · ~75 s per question
            </p>
          </Link>
        ))}
      </div>

      <p className="text-sm text-zinc-600">
        Prefer instant feedback and a solution after every question?{" "}
        <Link href="/practice" className="text-blue-700 underline">
          Use practice mode instead
        </Link>
        .
      </p>
    </div>
  );
}
