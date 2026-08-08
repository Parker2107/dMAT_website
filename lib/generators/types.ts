/**
 * Shared vocabulary for the three dMAT Core Module task types.
 *
 * Structures here mirror the official prep material exactly -- see
 * lib/rules.ts for the verbatim instructions these encode.
 */

export type TaskType = "figure_sequences" | "math_equations" | "latin_squares";
export type Difficulty = "low" | "medium" | "high";

export const TASK_TYPES: TaskType[] = [
  "figure_sequences",
  "math_equations",
  "latin_squares",
];

export const DIFFICULTIES: Difficulty[] = ["low", "medium", "high"];

export const TASK_LABELS: Record<TaskType, string> = {
  figure_sequences: "Figure Sequences",
  math_equations: "Mathematical Equations",
  latin_squares: "Latin Squares",
};

/** URL slugs, so routes read as /practice/figure-sequences. */
export const TASK_SLUGS: Record<TaskType, string> = {
  figure_sequences: "figure-sequences",
  math_equations: "math-equations",
  latin_squares: "latin-squares",
};

export const SLUG_TO_TASK: Record<string, TaskType> = {
  "figure-sequences": "figure_sequences",
  "math-equations": "math_equations",
  "latin-squares": "latin_squares",
};

/** Every subtest is 20 questions in 25 minutes -> 75 s per question. */
export const EXAM_QUESTION_COUNT = 20;
export const EXAM_DURATION_MS = 25 * 60 * 1000;
export const EXAM_PACE_MS = 75 * 1000;

export interface QuestionBase {
  seed: string;
  taskType: TaskType;
  difficulty: Difficulty;
  /** Solution path, written in the voice of the official solution keys. */
  explanation: string[];
}

/* ------------------------------------------------------------------ *
 * 1. Figure Sequences
 * ------------------------------------------------------------------ */

/** 4x4 matrix, exactly as in the prep material. */
export const MATRIX_SIZE = 4;

export type ShapeId =
  | "arrow"
  | "triangle"
  | "chevron"
  | "flag"
  | "ell"
  | "trapezoid"
  | "square"
  | "circle"
  | "cross"
  | "diamond";

/**
 * Shapes whose orientation is visible. Only these may be given a rotation
 * rule -- a rotating square or circle would be an unsolvable question.
 */
export const ASYMMETRIC_SHAPES: ShapeId[] = [
  "arrow",
  "triangle",
  "chevron",
  "flag",
  "ell",
  "trapezoid",
];

export const SYMMETRIC_SHAPES: ShapeId[] = ["square", "circle", "cross", "diamond"];

export type ColourId =
  | "black"
  | "white"
  | "pink"
  | "yellow"
  | "orange"
  | "green"
  | "blue";

export const COLOUR_HEX: Record<ColourId, string> = {
  black: "#1c1917",
  white: "#ffffff",
  pink: "#ec4899",
  yellow: "#facc15",
  orange: "#f97316",
  green: "#16a34a",
  blue: "#2563eb",
};

export const COLOUR_LABELS: Record<ColourId, string> = {
  black: "black",
  white: "white",
  pink: "pink",
  yellow: "yellow",
  orange: "orange",
  green: "green",
  blue: "blue",
};

export interface Glyph {
  shape: ShapeId;
  colour: ColourId;
  /** Row index, 0 = top. */
  row: number;
  /** Column index, 0 = left. */
  col: number;
  /** Degrees clockwise: 0, 90, 180 or 270. */
  rotation: number;
}

/** One matrix in the series. */
export type Frame = Glyph[];

export interface FigureSequenceQuestion extends QuestionBase {
  taskType: "figure_sequences";
  /** Matrices 1-4, which the test taker can see. */
  given: Frame[];
  /**
   * Response options. `options[0]` are the three candidates for Image 1
   * (matrix 5), `options[1]` for Image 2 (matrix 6).
   */
  options: [Frame[], Frame[]];
  /** Index of the correct option, for Image 1 and Image 2. */
  answer: [number, number];
}

/* ------------------------------------------------------------------ *
 * 2. Mathematical Equations
 * ------------------------------------------------------------------ */

/** "Each letter can be an integer between 1 and 20." */
export const MIN_VALUE = 1;
export const MAX_VALUE = 20;

export interface MathEquationsQuestion extends QuestionBase {
  taskType: "math_equations";
  /** Rendered equation strings, e.g. "5 · B = A". */
  equations: string[];
  /** Letters in play, in display order, e.g. ["A", "B", "C"]. */
  variables: string[];
  solution: Record<string, number>;
}

/* ------------------------------------------------------------------ *
 * 3. Latin Squares
 * ------------------------------------------------------------------ */

export const LATIN_SIZE = 5;
export const LATIN_LETTERS = ["A", "B", "C", "D", "E"] as const;
export type LatinLetter = (typeof LATIN_LETTERS)[number];

export interface LatinSquareQuestion extends QuestionBase {
  taskType: "latin_squares";
  /** 5x5; null means the cell is blank. The question cell is also null. */
  grid: (LatinLetter | null)[][];
  /** [row, col] of the cell holding the question mark. */
  questionCell: [number, number];
  answer: LatinLetter;
  /** The completed square, used to render the solved state after answering. */
  solution: LatinLetter[][];
}

export type Question =
  | FigureSequenceQuestion
  | MathEquationsQuestion
  | LatinSquareQuestion;

/** Answers as stored in the `attempts.answer` JSONB column. */
export type FigureSequenceAnswer = [number | null, number | null];
export type MathEquationsAnswer = Record<string, number | null>;
export type LatinSquareAnswer = LatinLetter | null;
export type QuestionAnswer =
  | FigureSequenceAnswer
  | MathEquationsAnswer
  | LatinSquareAnswer;
