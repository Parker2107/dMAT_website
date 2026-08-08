import { generateFigureSequenceQuestion } from "./figureSequences";
import { generateLatinSquareQuestion } from "./latinSquares";
import { generateMathEquationsQuestion } from "./mathEquations";
import type {
  Difficulty,
  FigureSequenceAnswer,
  LatinSquareAnswer,
  MathEquationsAnswer,
  Question,
  QuestionAnswer,
  TaskType,
} from "./types";

export * from "./types";

/**
 * The single entry point for question generation. Given the same seed it always
 * returns exactly the same question, which is what makes seeds shareable and
 * lets a past attempt be replayed.
 */
export function generateQuestion(
  taskType: TaskType,
  difficulty: Difficulty,
  seed: string,
): Question {
  switch (taskType) {
    case "figure_sequences":
      return generateFigureSequenceQuestion(seed, difficulty);
    case "math_equations":
      return generateMathEquationsQuestion(seed, difficulty);
    case "latin_squares":
      return generateLatinSquareQuestion(seed, difficulty);
  }
}

export function emptyAnswer(question: Question): QuestionAnswer {
  switch (question.taskType) {
    case "figure_sequences":
      return [null, null];
    case "math_equations":
      return Object.fromEntries(question.variables.map((v) => [v, null]));
    case "latin_squares":
      return null;
  }
}

/** True once the test taker has supplied every part of the answer. */
export function isAnswerComplete(
  question: Question,
  answer: QuestionAnswer,
): boolean {
  switch (question.taskType) {
    case "figure_sequences": {
      const value = answer as FigureSequenceAnswer;
      return value?.[0] !== null && value?.[1] !== null;
    }
    case "math_equations": {
      const value = (answer ?? {}) as MathEquationsAnswer;
      return question.variables.every(
        (name) => value[name] !== null && value[name] !== undefined,
      );
    }
    case "latin_squares":
      return (answer as LatinSquareAnswer) !== null;
  }
}

/**
 * Grading is all-or-nothing, matching the exam: a figure sequence needs both
 * images right, an equation system needs every letter right.
 */
export function gradeAnswer(
  question: Question,
  answer: QuestionAnswer,
): boolean {
  switch (question.taskType) {
    case "figure_sequences": {
      const value = answer as FigureSequenceAnswer;
      if (!value) return false;
      return value[0] === question.answer[0] && value[1] === question.answer[1];
    }
    case "math_equations": {
      const value = (answer ?? {}) as MathEquationsAnswer;
      return question.variables.every(
        (name) => value[name] === question.solution[name],
      );
    }
    case "latin_squares":
      return (answer as LatinSquareAnswer) === question.answer;
  }
}
