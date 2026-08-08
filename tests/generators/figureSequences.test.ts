import { describe, expect, it } from "vitest";

import {
  frameKey,
  generateFigureSequenceQuestion,
  positionKey,
  simulateSymbol,
  type SymbolRule,
} from "../../lib/generators/figureSequences";
import { formatSeed } from "../../lib/rng";
import {
  DIFFICULTIES,
  MATRIX_SIZE,
  SYMMETRIC_SHAPES,
  type Difficulty,
  type Frame,
} from "../../lib/generators/types";

const SAMPLES = 60;

const EXPECTED_SYMBOLS: Record<Difficulty, number> = { low: 1, medium: 3, high: 4 };

function seedFor(difficulty: Difficulty, i: number): string {
  return formatSeed("figure_sequences", difficulty, `T${String(i).padStart(5, "0")}`);
}

function assertFrameIsLegal(frame: Frame) {
  const cells = new Set<string>();
  for (const glyph of frame) {
    // "Figures cannot leave the matrix."
    expect(glyph.row).toBeGreaterThanOrEqual(0);
    expect(glyph.row).toBeLessThan(MATRIX_SIZE);
    expect(glyph.col).toBeGreaterThanOrEqual(0);
    expect(glyph.col).toBeLessThan(MATRIX_SIZE);
    expect([0, 90, 180, 270]).toContain(glyph.rotation);

    // "Figures cannot overlap."
    const cell = `${glyph.row},${glyph.col}`;
    expect(cells.has(cell)).toBe(false);
    cells.add(cell);
  }
}

describe("simulateSymbol", () => {
  it("bounces a vertical mover off the upper and lower boundary", () => {
    const rule: SymbolRule = {
      shape: "square",
      motion: {
        kind: "line",
        axis: "col",
        fixed: 1,
        position: 0,
        direction: 1,
        step: 1,
        growth: false,
      },
      rotation: { kind: "none" },
      colour: { kind: "fixed", colour: "blue" },
      startRotation: 0,
    };
    const states = simulateSymbol(rule, 6)!;
    expect(states.map((s) => s.row)).toEqual([0, 1, 2, 3, 2, 1]);
    expect(states.every((s) => s.col === 1)).toBe(true);
  });

  it("retraces a diagonal after meeting a boundary", () => {
    const rule: SymbolRule = {
      shape: "circle",
      motion: { kind: "diagonal", row: 3, col: 0, dRow: -1, dCol: 1 },
      rotation: { kind: "none" },
      colour: { kind: "fixed", colour: "green" },
      startRotation: 0,
    };
    const states = simulateSymbol(rule, 6)!;
    expect(states.map((s) => [s.row, s.col])).toEqual([
      [3, 0],
      [2, 1],
      [1, 2],
      [0, 3],
      [1, 2],
      [2, 1],
    ]);
  });

  it("walks the outer border clockwise", () => {
    const rule: SymbolRule = {
      shape: "cross",
      motion: { kind: "perimeter", index: 0, direction: 1, step: 1, growth: false },
      rotation: { kind: "none" },
      colour: { kind: "fixed", colour: "black" },
      startRotation: 0,
    };
    const states = simulateSymbol(rule, 6)!;
    expect(states.map((s) => [s.row, s.col])).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 3],
      [2, 3],
    ]);
  });

  it("grows the step count by x + 1", () => {
    const rule: SymbolRule = {
      shape: "cross",
      motion: { kind: "perimeter", index: 0, direction: 1, step: 1, growth: true },
      rotation: { kind: "none" },
      colour: { kind: "fixed", colour: "black" },
      startRotation: 0,
    };
    const states = simulateSymbol(rule, 5)!;
    // ring indices 0, +1 -> 1, +2 -> 3, +3 -> 6, +4 -> 10
    expect(states.map((s) => [s.row, s.col])).toEqual([
      [0, 0],
      [0, 1],
      [0, 3],
      [3, 3],
      [2, 0],
    ]);
  });

  it("turns x + 1 times by 90 degrees", () => {
    const rule: SymbolRule = {
      shape: "arrow",
      motion: { kind: "perimeter", index: 0, direction: 1, step: 1, growth: false },
      rotation: { kind: "growth", direction: 1 },
      colour: { kind: "fixed", colour: "black" },
      startRotation: 0,
    };
    const states = simulateSymbol(rule, 5)!;
    // cumulative quarter turns: 0, 1, 3, 6, 10 -> degrees mod 360
    expect(states.map((s) => s.rotation)).toEqual([0, 90, 270, 180, 180]);
  });
});

describe("generateFigureSequenceQuestion", () => {
  for (const difficulty of DIFFICULTIES) {
    it(`produces legal ${difficulty} series`, () => {
      for (let i = 0; i < SAMPLES; i++) {
        const seed = seedFor(difficulty, i);
        const question = generateFigureSequenceQuestion(seed, difficulty);

        expect(question.given).toHaveLength(4);
        expect(question.options[0]).toHaveLength(3);
        expect(question.options[1]).toHaveLength(3);
        expect(question.explanation).toHaveLength(EXPECTED_SYMBOLS[difficulty]);

        const [answerOne, answerTwo] = question.answer;
        expect(answerOne).toBeGreaterThanOrEqual(0);
        expect(answerOne).toBeLessThan(3);
        expect(answerTwo).toBeGreaterThanOrEqual(0);
        expect(answerTwo).toBeLessThan(3);

        // The complete series as the test taker would see it once answered.
        const series: Frame[] = [
          ...question.given,
          question.options[0][answerOne],
          question.options[1][answerTwo],
        ];

        const shapes = series[0].map((g) => g.shape).sort();
        expect(shapes).toHaveLength(EXPECTED_SYMBOLS[difficulty]);
        expect(new Set(shapes).size).toBe(shapes.length);

        for (const frame of series) {
          assertFrameIsLegal(frame);
          // "Figures cannot disappear."
          expect(frame.map((g) => g.shape).sort()).toEqual(shapes);
        }

        // Every option shown on screen must itself be a legal matrix.
        for (const optionSet of question.options) {
          for (const option of optionSet) {
            assertFrameIsLegal(option);
            expect(option.map((g) => g.shape).sort()).toEqual(shapes);
          }
          // Exactly three distinct options.
          expect(new Set(optionSet.map(frameKey)).size).toBe(3);

          // And distinct at a glance: no two options may place every figure on
          // the same cell and differ only by a colour or an orientation, which
          // reads as a duplicate on screen.
          expect(new Set(optionSet.map(positionKey)).size).toBe(3);
        }

        // Exactly one option per image may match the correct continuation.
        for (let image = 0; image < 2; image++) {
          const correct = frameKey(question.options[image][question.answer[image]]);
          const matches = question.options[image].filter(
            (o) => frameKey(o) === correct,
          );
          expect(matches).toHaveLength(1);
        }

        // Rotation must only ever be applied to shapes whose orientation shows.
        for (const shape of shapes) {
          if (!SYMMETRIC_SHAPES.includes(shape)) continue;
          const rotations = new Set(
            series.map((f) => f.find((g) => g.shape === shape)!.rotation),
          );
          expect(rotations.size).toBe(1);
        }

        // Something has to actually change, or the series is unanswerable.
        expect(new Set(series.map(frameKey)).size).toBeGreaterThan(1);

        // No figure may stall. A step-2 line mover that bounces off the wall of
        // a 4-wide matrix lands back on the cell it started from, which reads
        // as "this figure has no rule" and makes the continuation guesswork.
        for (const shape of shapes) {
          const track = series.map((f) => {
            const glyph = f.find((g) => g.shape === shape)!;
            return `${glyph.row},${glyph.col}`;
          });
          for (let f = 1; f < track.length; f++) {
            expect(track[f]).not.toBe(track[f - 1]);
          }
        }
      }
    });
  }

  it("never repeats a given matrix as the answer", () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 40; i++) {
        const question = generateFigureSequenceQuestion(
          seedFor(difficulty, i),
          difficulty,
        );
        const givenKeys = new Set(question.given.map(frameKey));
        const five = frameKey(question.options[0][question.answer[0]]);
        const six = frameKey(question.options[1][question.answer[1]]);
        expect(givenKeys.has(five)).toBe(false);
        expect(givenKeys.has(six)).toBe(false);
        expect(five).not.toBe(six);
      }
    }
  });

  it("is deterministic for a given seed", () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 20; i++) {
        const seed = seedFor(difficulty, i);
        const a = generateFigureSequenceQuestion(seed, difficulty);
        const b = generateFigureSequenceQuestion(seed, difficulty);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      }
    }
  });
});
