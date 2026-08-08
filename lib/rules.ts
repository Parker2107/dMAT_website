/**
 * Task-type reference for the three dMAT Core Module formats.
 *
 * This is an original description of how each task type works, written for this
 * project. It is not a reproduction of the official preparatory materials, and
 * the worked examples below were written from scratch rather than copied. The
 * underlying facts -- grid sizes, how many response options there are, the
 * number of questions and the time limit -- are just facts about the exam.
 *
 * This project is unofficial and is not affiliated with or endorsed by g.a.s.t.
 * or the TestDaF-Institut.
 */

import type { TaskType } from "./generators/types";

export interface WorkedExample {
  title: string;
  prompt: string[];
  solution: string;
}

export interface TaskRules {
  title: string;
  summary: string[];
  /** The constraints a valid question always satisfies. */
  rules: string[];
  examples: WorkedExample[];
  timing: string;
  /** How this app presents the format, so nothing is a surprise in the exam. */
  appNotes: string[];
}

export const RULES: Record<TaskType, TaskRules> = {
  figure_sequences: {
    title: "Figure Sequences",
    summary: [
      "You are shown a series of matrices. From one matrix to the next, the figures inside can shift position, change colour and change orientation — always according to a consistent rule that holds across the whole series.",
      "Your job is to work out the rule governing each figure and decide what the next two matrices look like.",
      "Track one property at a time: first where each figure moves, then whether it turns, then whether its colour changes. Rules combine, but each figure follows its own.",
    ],
    rules: [
      "A figure may change colour, cycling through two or more colours in a fixed order.",
      "A figure may rotate about its own axis, a quarter turn at a time.",
      "A figure may move horizontally, vertically or diagonally. A figure that moves diagonally keeps moving diagonally — it never switches to another kind of movement.",
      "A figure may travel around the outer border of the matrix, clockwise or anticlockwise.",
      "A rule may grow by one each step (x + 1). A figure that moves one field between the first two matrices moves two between the next pair, then three, and so on. The same growth can apply to how far it turns.",
      "Figures never disappear, and no two figures ever occupy the same field.",
      "Figures never leave the matrix. On meeting an outer edge, a figure either bounces back the way it came or carries on along the edge.",
    ],
    examples: [
      {
        title: "Worked example",
        prompt: [
          "A single figure sits in the top-left field. In the next matrix it is one field to the right, then one further right again, and by the fourth matrix it has reached the top-right corner.",
        ],
        solution:
          "The figure moves one field at a time along the top row. It has now reached the right-hand edge, so the boundary rule decides what happens next: either it bounces and comes back left, or it turns the corner and continues down the right-hand edge. Whichever the earlier matrices show it doing at an edge is what it will do here.",
      },
    ],
    timing:
      "The subtest gives you 25 minutes for 20 series — about 75 seconds each. Answer every question: a guess costs nothing, and an unanswered question scores the same as a wrong one. No notes are allowed.",
    appNotes: [
      "The matrix is 4 × 4. Matrices 1 to 4 are shown; matrices 5 and 6 are hidden.",
      "You choose one of three response options for Image 1 (matrix 5) and, separately, one of three for Image 2 (matrix 6). Both must be right for the question to count as correct.",
      "Low difficulty uses a single figure. Medium uses three. High uses four, combining movement, rotation, colour cycling and x + 1 growth.",
      "Only figures whose orientation is visible are ever given a rotation rule — a rotating square would be unanswerable.",
    ],
  },

  math_equations: {
    title: "Mathematical Equations",
    summary: [
      "You are given a small system of equations written with letters standing in for numbers.",
      "Find the number each letter represents so that every equation in the system holds at the same time.",
      "There is always exactly one set of values that works. Start from whichever equation pins a single letter down, then substitute that value into the others.",
    ],
    rules: [
      "Every letter stands for a whole number from 1 to 20.",
      "All the equations in a system must hold simultaneously.",
      "Exactly one set of values satisfies the system — no guesswork is needed, and no second answer exists.",
      "`·` means multiply and `:` means divide.",
    ],
    examples: [
      {
        title: "Worked example 1",
        prompt: ["A + 3 = B", "B = 9"],
        solution:
          "The second equation gives B directly: B = 9. Substituting into the first gives A + 3 = 9, so A = 6. Whenever one equation names a letter outright, start there.",
      },
      {
        title: "Worked example 2",
        prompt: ["B = 2 · A", "A + B = 15"],
        solution:
          "The first equation expresses B in terms of A, so replace B in the second: A + 2 · A = 15, that is 3 · A = 15, giving A = 5. Putting that back into the first equation gives B = 10. When no letter is given outright, substitute until one letter is left.",
      },
    ],
    timing:
      "The subtest gives you 25 minutes for 20 systems — about 75 seconds each. No notes are allowed, so the substitution has to be done in your head.",
    appNotes: [
      "Enter a number for every letter. All of them must be right for the question to count as correct.",
      "Low difficulty uses 2 equations and 2 letters, medium 3 and 3, high 4 and 4.",
      "Generated systems are checked exhaustively over the whole 1–20 range, so a question is only ever shown if it has exactly one solution.",
    ],
  },

  latin_squares: {
    title: "Latin Squares",
    summary: [
      "You are shown a 5 × 5 grid. Some fields already contain a letter and one field holds a question mark.",
      "Each of the five letters appears exactly once in every row and exactly once in every column. Only the letters offered as responses can appear in the grid.",
      "Decide which letter belongs in the question-mark field. Sometimes you can read it straight off its own row and column; sometimes you have to work out one or two other fields first.",
    ],
    rules: [
      "Each letter appears exactly once in every row.",
      "Each letter appears exactly once in every column.",
      "Only the letters shown in the response row (A–E) appear anywhere in the grid.",
      "The question-mark field is always determined by the letters already given — you never have to guess or try a letter and backtrack.",
    ],
    examples: [
      {
        title: "Worked example 1 — read it off directly",
        prompt: [
          "The question mark sits in a column that already contains A, C, D and E.",
        ],
        solution:
          "Four of the five letters are already in that column, so the only one left for the question mark is B. When the answer is this direct, check the row too — either one alone can settle it.",
      },
      {
        title: "Worked example 2 — fill in a field first",
        prompt: [
          "Neither the question mark's own row nor its own column is missing just one letter.",
        ],
        solution:
          "Look for a different empty field that is fully determined — one where four of the five letters already appear across its row and column. Fill that in mentally, and it often completes the question mark's row or column, which then gives the answer. Harder questions chain several such steps together.",
      },
    ],
    timing:
      "The subtest gives you 25 minutes for 20 grids — about 75 seconds each. Answer every question, since a guess costs nothing. No notes are allowed.",
    appNotes: [
      "Difficulty here is measured rather than estimated: low needs one deduction, medium two or three, high four or more.",
      "Every generated grid is solvable by pure elimination — you never have to guess a letter and backtrack.",
    ],
  },
};

export const GENERAL_NOTES = [
  "The Core Module has three subtests. Each gives you 25 minutes for 20 questions — about 75 seconds per question.",
  "You may not take notes at any point during the exam.",
  "There is no penalty for a wrong answer, so never leave a question blank. Guess if you have to.",
  "The three subtests test different things but share a rhythm: read the constraint, find the one thing that fixes the answer, commit, move on.",
];
