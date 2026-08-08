"use client";

import { MatrixSvg } from "@/components/render/MatrixSvg";
import type { FigureSequenceQuestion } from "@/lib/generators/types";

export type FigureSelection = [number | null, number | null];

interface Props {
  question: FigureSequenceQuestion;
  selection: FigureSelection;
  onSelect: (image: 0 | 1, option: number) => void;
  disabled?: boolean;
  showResult?: boolean;
}

const IMAGE_LABELS = ["Image 1", "Image 2"] as const;

/**
 * Mirrors the official layout: matrices 1-4 in a row followed by two grey "?"
 * placeholders, then a three-row table of response options with Image 1 on the
 * left and Image 2 on the right.
 */
export function FigureSequenceQuestionView({
  question,
  selection,
  onSelect,
  disabled = false,
  showResult = false,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="-mx-2 overflow-x-auto px-2 pb-2">
        <div className="flex min-w-max items-start gap-3">
          {question.given.map((frame, index) => (
            <MatrixSvg
              key={index}
              frame={frame}
              size={132}
              label={`Matrix ${index + 1}`}
            />
          ))}
          <div className="mx-1 w-px self-stretch bg-zinc-300" aria-hidden />
          {IMAGE_LABELS.map((label) => (
            <MatrixSvg key={label} placeholder size={132} label={label} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-8">
        {([0, 1] as const).map((image) => (
          <div key={image} className="space-y-2">
            <h3 className="text-center text-sm font-semibold text-zinc-700">
              {IMAGE_LABELS[image]}
            </h3>
            <div className="flex flex-col items-center gap-2">
              {question.options[image].map((option, index) => {
                const isSelected = selection[image] === index;
                const isCorrect = question.answer[image] === index;

                let tone = "border-zinc-300 hover:border-zinc-500";
                if (showResult && isCorrect) {
                  tone = "border-emerald-500 bg-emerald-50";
                } else if (showResult && isSelected) {
                  tone = "border-red-500 bg-red-50";
                } else if (isSelected) {
                  tone = "border-blue-600 bg-blue-50";
                }

                return (
                  <button
                    key={index}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(image, index)}
                    aria-pressed={isSelected}
                    className={`flex w-full flex-col items-center rounded-lg border-2 p-2 transition-colors disabled:cursor-default ${tone}`}
                  >
                    <MatrixSvg frame={option} size={116} />
                    <span className="mt-1 text-xs text-zinc-600">
                      Matrix {index + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
