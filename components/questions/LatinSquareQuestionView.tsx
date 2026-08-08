"use client";

import { LatinGrid } from "@/components/render/LatinGrid";
import {
  LATIN_LETTERS,
  type LatinLetter,
  type LatinSquareQuestion,
} from "@/lib/generators/types";

interface Props {
  question: LatinSquareQuestion;
  selected: LatinLetter | null;
  onSelect: (letter: LatinLetter) => void;
  disabled?: boolean;
  showResult?: boolean;
}

export function LatinSquareQuestionView({
  question,
  selected,
  onSelect,
  disabled = false,
  showResult = false,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-6">
      <LatinGrid question={question} selected={selected} revealed={showResult} />

      <div>
        <p className="mb-2 text-center text-sm text-zinc-600">
          Which letter belongs in the field with the question mark?
        </p>
        <div className="flex justify-center gap-2">
          {LATIN_LETTERS.map((letter) => {
            const isSelected = selected === letter;
            const isCorrect = question.answer === letter;

            let tone = "border-zinc-300 bg-white hover:border-zinc-500";
            if (showResult && isCorrect) {
              tone = "border-emerald-500 bg-emerald-50 text-emerald-800";
            } else if (showResult && isSelected) {
              tone = "border-red-500 bg-red-50 text-red-700";
            } else if (isSelected) {
              tone = "border-blue-600 bg-blue-50 text-blue-800";
            }

            return (
              <button
                key={letter}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(letter)}
                aria-pressed={isSelected}
                className={`h-14 w-14 rounded-md border-2 text-xl font-semibold transition-colors disabled:cursor-default ${tone}`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
