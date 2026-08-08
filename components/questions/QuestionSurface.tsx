"use client";

import type {
  FigureSequenceAnswer,
  LatinLetter,
  LatinSquareAnswer,
  MathEquationsAnswer,
  Question,
  QuestionAnswer,
} from "@/lib/generators/types";

import { FigureSequenceQuestionView } from "./FigureSequenceQuestionView";
import { LatinSquareQuestionView } from "./LatinSquareQuestionView";
import { MathEquationsQuestionView } from "./MathEquationsQuestionView";

interface Props {
  question: Question;
  answer: QuestionAnswer;
  onAnswer: (answer: QuestionAnswer) => void;
  disabled?: boolean;
  showResult?: boolean;
}

/** Dispatches to the right question renderer and keeps answer shapes uniform. */
export function QuestionSurface({
  question,
  answer,
  onAnswer,
  disabled = false,
  showResult = false,
}: Props) {
  switch (question.taskType) {
    case "figure_sequences": {
      const selection = (answer as FigureSequenceAnswer) ?? [null, null];
      return (
        <FigureSequenceQuestionView
          question={question}
          selection={selection}
          disabled={disabled}
          showResult={showResult}
          onSelect={(image, option) => {
            const next: FigureSequenceAnswer = [selection[0], selection[1]];
            next[image] = option;
            onAnswer(next);
          }}
        />
      );
    }
    case "math_equations": {
      const values = (answer as MathEquationsAnswer) ?? {};
      return (
        <MathEquationsQuestionView
          question={question}
          values={values}
          disabled={disabled}
          showResult={showResult}
          onChange={(variable, value) =>
            onAnswer({ ...values, [variable]: value })
          }
        />
      );
    }
    case "latin_squares":
      return (
        <LatinSquareQuestionView
          question={question}
          selected={(answer as LatinSquareAnswer) ?? null}
          disabled={disabled}
          showResult={showResult}
          onSelect={(letter: LatinLetter) => onAnswer(letter)}
        />
      );
  }
}
