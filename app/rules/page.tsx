import Link from "next/link";

import { GENERAL_NOTES, RULES } from "@/lib/rules";
import { TASK_SLUGS, TASK_TYPES } from "@/lib/generators/types";

export default function RulesIndexPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Rules</h1>
        <p className="text-sm text-zinc-600">
          The instructions for each task type, from the official dMAT preparatory
          materials.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-300 bg-white p-4">
        <h2 className="mb-2 font-semibold">The Core Module</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
          {GENERAL_NOTES.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {TASK_TYPES.map((taskType) => (
          <Link
            key={taskType}
            href={`/rules/${TASK_SLUGS[taskType]}`}
            className="rounded-lg border border-zinc-300 bg-white p-4 hover:border-zinc-500"
          >
            <h2 className="font-semibold">{RULES[taskType].title}</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {RULES[taskType].summary[0]}
            </p>
            <p className="mt-2 text-sm text-blue-700 underline">
              Read the full rules →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
