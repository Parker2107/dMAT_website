import Link from "next/link";

import { RULES } from "@/lib/rules";
import { TASK_SLUGS, type TaskType } from "@/lib/generators/types";

interface Props {
  taskType: TaskType;
  /** Exam mode keeps this shut so it cannot become a crutch under time. */
  defaultOpen?: boolean;
}

/** The official rules, inline on the question page. */
export function RulesPanel({ taskType, defaultOpen = false }: Props) {
  const rules = RULES[taskType];

  return (
    <details
      open={defaultOpen}
      className="rounded-lg border border-zinc-300 bg-white px-4 py-3"
    >
      <summary className="cursor-pointer text-sm font-semibold text-zinc-700">
        Rules for {rules.title}
      </summary>
      <div className="mt-3 space-y-3 text-sm text-zinc-700">
        {rules.summary.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
        <ul className="list-disc space-y-1 pl-5">
          {rules.rules.map((rule, index) => (
            <li key={index}>{rule}</li>
          ))}
        </ul>
        <p className="text-zinc-500">{rules.timing}</p>
        <Link
          href={`/rules/${TASK_SLUGS[taskType]}`}
          className="inline-block text-blue-700 underline"
        >
          Full instructions and worked examples →
        </Link>
      </div>
    </details>
  );
}
