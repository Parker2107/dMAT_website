import {
  LATIN_SIZE,
  type LatinLetter,
  type LatinSquareQuestion,
} from "@/lib/generators/types";

interface LatinGridProps {
  question: LatinSquareQuestion;
  /** The letter currently selected, shown in the question-mark cell. */
  selected?: LatinLetter | null;
  /** After answering, fills in every blank from the completed square. */
  revealed?: boolean;
}

/**
 * The 5 × 5 grid. The question cell is highlighted in red, matching the
 * official material ("B needs to replace the red question mark").
 *
 * Once revealed, the question cell shows the *correct* letter, not the one that
 * was picked. Showing a wrong pick inside an otherwise solved grid produces a
 * square that breaks the row and column rule -- three of the same letter in one
 * corner -- which is exactly the thing the task is about.
 */
export function LatinGrid({ question, selected, revealed = false }: LatinGridProps) {
  const [qRow, qCol] = question.questionCell;
  const wasWrong = revealed && selected != null && selected !== question.answer;

  return (
    <div
      className="inline-grid gap-0 border-2 border-zinc-900 bg-zinc-900"
      style={{ gridTemplateColumns: `repeat(${LATIN_SIZE}, minmax(0, 1fr))` }}
      role="table"
      aria-label="Latin square"
    >
      {question.grid.map((row, r) =>
        row.map((cell, c) => {
          const isQuestion = r === qRow && c === qCol;
          const filledIn = revealed && cell === null && !isQuestion;

          let tone = "bg-white text-zinc-900";
          if (isQuestion) {
            if (!revealed) tone = "bg-red-50 text-red-600";
            else if (wasWrong) tone = "bg-red-50 text-emerald-700";
            else tone = "bg-emerald-50 text-emerald-700";
          } else if (filledIn) {
            tone = "bg-emerald-50 text-emerald-700";
          }

          return (
            <div
              key={`${r}-${c}`}
              role="cell"
              className={[
                "flex flex-col items-center justify-center border border-zinc-900",
                "h-12 w-12 text-lg font-semibold sm:h-14 sm:w-14 sm:text-xl",
                tone,
              ].join(" ")}
            >
              {isQuestion ? (
                revealed ? (
                  <>
                    <span className="leading-none">{question.answer}</span>
                    {wasWrong && (
                      <span className="text-[10px] font-medium leading-none text-red-500 line-through">
                        {selected}
                      </span>
                    )}
                  </>
                ) : (
                  (selected ?? "?")
                )
              ) : (
                (cell ?? (revealed ? question.solution[r][c] : ""))
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}
