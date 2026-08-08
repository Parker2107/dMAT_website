import { GlyphChip } from "@/components/render/GlyphSvg";
import type { Question } from "@/lib/generators/types";

interface Props {
  question: Question;
  correct: boolean;
}

/**
 * The generated solution path, written in the voice of the official solution
 * keys. For figure sequences each line describes one figure, so the figure
 * itself is shown next to its rule.
 */
export function ExplanationPanel({ question, correct }: Props) {
  const firstFrame =
    question.taskType === "figure_sequences" ? question.given[0] : null;

  return (
    <section
      className={`rounded-lg border-2 p-4 ${
        correct ? "border-emerald-500 bg-emerald-50" : "border-red-400 bg-red-50"
      }`}
    >
      <h2 className="mb-3 font-semibold">
        {correct ? "Correct" : "Not correct"}
        <span className="ml-2 font-normal text-zinc-600">— solution path</span>
      </h2>

      <ol className="space-y-2 text-sm text-zinc-800">
        {question.explanation.map((line, index) => {
          const glyph = firstFrame?.[index];
          return (
            <li key={index} className="flex gap-2">
              {glyph ? (
                <GlyphChip shape={glyph.shape} colour={glyph.colour} />
              ) : (
                <span className="font-mono text-zinc-400">{index + 1}.</span>
              )}
              <span>{line}</span>
            </li>
          );
        })}
      </ol>

      {question.taskType === "math_equations" && (
        <p className="mt-3 font-mono text-sm">
          {question.variables
            .map((name) => `${name} = ${question.solution[name]}`)
            .join(",  ")}
        </p>
      )}
    </section>
  );
}
