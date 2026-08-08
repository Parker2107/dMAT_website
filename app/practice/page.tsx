import Link from "next/link";

import { RULES } from "@/lib/rules";
import { TASK_LABELS, TASK_SLUGS, TASK_TYPES } from "@/lib/generators/types";

export default function PracticeIndexPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Practice</h1>
        <p className="text-sm text-zinc-600">
          Endless generated questions with instant feedback and a per-question
          stopwatch. Pick a task type.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {TASK_TYPES.map((taskType) => (
          <Link
            key={taskType}
            href={`/practice/${TASK_SLUGS[taskType]}`}
            className="rounded-lg border border-zinc-300 bg-white p-4 hover:border-zinc-500"
          >
            <h2 className="font-semibold">{TASK_LABELS[taskType]}</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {RULES[taskType].summary[0]}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
