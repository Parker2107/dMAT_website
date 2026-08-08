import { EXAM_PACE_MS } from "@/lib/generators/types";
import { formatPercent, formatSeconds } from "@/lib/format";

interface Props {
  label: string;
  accent: string;
  total: number;
  correct: number;
  medianMs: number;
  unique: number;
}

/**
 * A headline number per task type. This is a stat tile, not a one-bar chart:
 * the reader wants the current value, not a comparison of three magnitudes.
 */
export function StatTile({
  label,
  accent,
  total,
  correct,
  medianMs,
  unique,
}: Props) {
  const overPace = medianMs > EXAM_PACE_MS;

  return (
    <article className="rounded-lg border border-zinc-300 bg-white p-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-3 w-3 shrink-0 rounded-sm"
          style={{ background: accent }}
        />
        <h3 className="text-sm font-semibold text-zinc-700">{label}</h3>
      </div>

      <p className="mt-2 text-4xl font-semibold tracking-tight text-zinc-900">
        {total}
      </p>
      <p className="text-xs text-zinc-500">
        questions practised
        {unique < total && total > 0 && <> · {unique} distinct</>}
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-zinc-500">Accuracy</dt>
        <dd className="text-right font-medium tabular-nums">
          {formatPercent(correct, total)}
        </dd>

        <dt className="text-zinc-500">Median time</dt>
        <dd
          className={`text-right font-medium tabular-nums ${
            overPace ? "text-amber-700" : ""
          }`}
          title={
            overPace
              ? "Slower than the 75 s exam pace"
              : "Within the 75 s exam pace"
          }
        >
          {total === 0 ? "—" : formatSeconds(medianMs)}
        </dd>
      </dl>
    </article>
  );
}
