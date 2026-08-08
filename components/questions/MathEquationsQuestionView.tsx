"use client";

import type {
  MathEquationsAnswer,
  MathEquationsQuestion,
} from "@/lib/generators/types";

interface Props {
  question: MathEquationsQuestion;
  values: MathEquationsAnswer;
  onChange: (variable: string, value: number | null) => void;
  disabled?: boolean;
  showResult?: boolean;
}

export function MathEquationsQuestionView({
  question,
  values,
  onChange,
  disabled = false,
  showResult = false,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-300 bg-white p-6">
        <ul className="space-y-3 text-center font-mono text-xl sm:text-2xl">
          {question.equations.map((equation, index) => (
            <li key={index}>{equation}</li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-sm text-zinc-600">
          What number does each letter correspond to? Each letter is a whole
          number between 1 and 20.
        </p>
        <div className="flex flex-wrap gap-4">
          {question.variables.map((name) => {
            const entered = values?.[name];
            const correct = question.solution[name];
            const isRight = entered === correct;

            let tone = "border-zinc-300";
            if (showResult) {
              tone = isRight
                ? "border-emerald-500 bg-emerald-50"
                : "border-red-500 bg-red-50";
            }

            return (
              <label key={name} className="flex items-center gap-2">
                <span className="font-mono text-lg font-semibold">{name} =</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={20}
                  step={1}
                  value={entered === null || entered === undefined ? "" : entered}
                  disabled={disabled}
                  onChange={(event) => {
                    const raw = event.target.value;
                    onChange(name, raw === "" ? null : Number(raw));
                  }}
                  className={`w-20 rounded-md border-2 px-2 py-2 text-center font-mono text-lg outline-none focus:border-blue-600 disabled:bg-zinc-100 ${tone}`}
                />
                {showResult && !isRight && (
                  <span className="font-mono text-sm text-emerald-700">
                    → {correct}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
