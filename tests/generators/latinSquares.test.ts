import { describe, expect, it } from "vitest";

import {
  generateLatinSquareQuestion,
  randomLatinSquare,
  solveForCell,
} from "../../lib/generators/latinSquares";
import { createRng, formatSeed } from "../../lib/rng";
import {
  DIFFICULTIES,
  LATIN_LETTERS,
  LATIN_SIZE,
  type Difficulty,
  type LatinLetter,
} from "../../lib/generators/types";

const SAMPLES = 120;

function seedFor(difficulty: Difficulty, i: number): string {
  return formatSeed("latin_squares", difficulty, `T${String(i).padStart(5, "0")}`);
}

function isValidLatinSquare(square: LatinLetter[][]): boolean {
  for (let i = 0; i < LATIN_SIZE; i++) {
    const row = new Set(square[i]);
    const col = new Set(square.map((r) => r[i]));
    if (row.size !== LATIN_SIZE || col.size !== LATIN_SIZE) return false;
  }
  return true;
}

const EXPECTED_DEPTH: Record<Difficulty, [number, number]> = {
  low: [1, 1],
  medium: [2, 3],
  high: [4, 12],
};

describe("randomLatinSquare", () => {
  it("always produces a valid Latin square", () => {
    for (let i = 0; i < 500; i++) {
      const square = randomLatinSquare(createRng(`square-${i}`));
      expect(isValidLatinSquare(square)).toBe(true);
    }
  });
});

describe("generateLatinSquareQuestion", () => {
  for (const difficulty of DIFFICULTIES) {
    it(`produces solvable ${difficulty} questions at the right depth`, () => {
      const depths: number[] = [];

      for (let i = 0; i < SAMPLES; i++) {
        const seed = seedFor(difficulty, i);
        const question = generateLatinSquareQuestion(seed, difficulty);
        const [qRow, qCol] = question.questionCell;

        expect(isValidLatinSquare(question.solution)).toBe(true);
        expect(question.grid[qRow][qCol]).toBeNull();
        expect(LATIN_LETTERS).toContain(question.answer);
        expect(question.answer).toBe(question.solution[qRow][qCol]);
        expect(question.explanation.length).toBeGreaterThan(0);

        // Every given must agree with the completed square.
        for (let r = 0; r < LATIN_SIZE; r++) {
          for (let c = 0; c < LATIN_SIZE; c++) {
            const given = question.grid[r][c];
            if (given !== null) expect(given).toBe(question.solution[r][c]);
          }
        }

        // The question must be answerable by pure propagation, no guessing.
        const solved = solveForCell(question.grid, qRow, qCol);
        expect(solved.determined).toBe(true);
        expect(solved.answer).toBe(question.answer);

        const [min, max] = EXPECTED_DEPTH[difficulty];
        expect(solved.depth).toBeGreaterThanOrEqual(min);
        expect(solved.depth).toBeLessThanOrEqual(max);
        depths.push(solved.depth);
      }

      // Sanity: the band should actually be exercised, not collapsed onto one value.
      if (difficulty !== "low") {
        expect(new Set(depths).size).toBeGreaterThan(1);
      }
    });
  }

  it("is deterministic for a given seed", () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 25; i++) {
        const seed = seedFor(difficulty, i);
        const a = generateLatinSquareQuestion(seed, difficulty);
        const b = generateLatinSquareQuestion(seed, difficulty);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      }
    }
  });
});
