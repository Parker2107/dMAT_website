import Link from "next/link";
import { notFound } from "next/navigation";

import { RULES } from "@/lib/rules";
import {
  SLUG_TO_TASK,
  TASK_SLUGS,
  TASK_TYPES,
} from "@/lib/generators/types";

export function generateStaticParams() {
  return TASK_TYPES.map((taskType) => ({ type: TASK_SLUGS[taskType] }));
}

export default async function RulesPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const taskType = SLUG_TO_TASK[type];
  if (!taskType) notFound();

  const rules = RULES[taskType];

  return (
    <article className="max-w-3xl space-y-6">
      <header>
        <Link href="/rules" className="text-sm text-blue-700 underline">
          ← All rules
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{rules.title}</h1>
      </header>

      <section className="space-y-3 rounded-lg border border-zinc-300 bg-white p-5">
        <h2 className="font-semibold">What the task asks</h2>
        {rules.summary.map((line, index) => (
          <p key={index} className="text-zinc-800">
            {line}
          </p>
        ))}
      </section>

      <section className="rounded-lg border border-zinc-300 bg-white p-5">
        <h2 className="mb-2 font-semibold">Rules</h2>
        <ul className="list-disc space-y-2 pl-5 text-zinc-800">
          {rules.rules.map((rule, index) => (
            <li key={index}>{rule}</li>
          ))}
        </ul>
      </section>

      {rules.examples.map((example) => (
        <section
          key={example.title}
          className="rounded-lg border border-zinc-300 bg-white p-5"
        >
          <h2 className="mb-2 font-semibold">{example.title}</h2>
          <ul className="mb-3 space-y-1 font-mono text-lg">
            {example.prompt.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
          <p className="text-zinc-800">
            <span className="font-semibold">Solution. </span>
            {example.solution}
          </p>
        </section>
      ))}

      <section className="rounded-lg border border-zinc-300 bg-amber-50 p-5">
        <h2 className="mb-2 font-semibold">Timing</h2>
        <p className="text-zinc-800">{rules.timing}</p>
      </section>

      <section className="rounded-lg border border-zinc-300 bg-white p-5">
        <h2 className="mb-2 font-semibold">How this app presents it</h2>
        <ul className="list-disc space-y-2 pl-5 text-zinc-800">
          {rules.appNotes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      </section>

      <div className="flex gap-3">
        <Link
          href={`/practice/${TASK_SLUGS[taskType]}`}
          className="rounded-md bg-zinc-900 px-5 py-2.5 font-medium text-white"
        >
          Practise this task type
        </Link>
        <Link
          href={`/exam/${TASK_SLUGS[taskType]}`}
          className="rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-zinc-700 hover:border-zinc-500"
        >
          Timed 20-question set
        </Link>
      </div>

      <p className="text-xs text-zinc-500">
        This is an unofficial practice tool, not affiliated with or endorsed by
        g.a.s.t. or the TestDaF-Institut. The description above is written for
        this project; always check the official preparatory materials for the
        authoritative instructions.
      </p>
    </article>
  );
}
