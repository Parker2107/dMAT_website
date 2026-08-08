import { describe, expect, it } from "vitest";

import {
  countSolutions,
  evaluate,
  generateMathEquationsQuestion,
  renderEquation,
  type Equation,
} from "../../lib/generators/mathEquations";
import { formatSeed } from "../../lib/rng";
import {
  DIFFICULTIES,
  MAX_VALUE,
  MIN_VALUE,
  type Difficulty,
} from "../../lib/generators/types";

const SAMPLES = 60;

const EXPECTED_COUNT: Record<Difficulty, number> = { low: 2, medium: 3, high: 4 };

function seedFor(difficulty: Difficulty, i: number): string {
  return formatSeed("math_equations", difficulty, `T${String(i).padStart(5, "0")}`);
}

describe("countSolutions", () => {
  it("finds the single solution of the official exercise 5", () => {
    // A - B + C - D = 2 ; 10 · B = C ; 5 · B = A ; 11 + B = D
    // Official solution: A = 5, B = 1, C = 10, D = 12.
    const A = { t: "var", name: "A" } as const;
    const B = { t: "var", name: "B" } as const;
    const C = { t: "var", name: "C" } as const;
    const D = { t: "var", name: "D" } as const;
    const n = (v: number) => ({ t: "num", v }) as const;

    const equations: Equation[] = [
      {
        left: { t: "sub", a: { t: "add", a: { t: "sub", a: A, b: B }, b: C }, b: D },
        right: n(2),
      },
      { left: { t: "mul", a: n(10), b: B }, right: C },
      { left: { t: "mul", a: n(5), b: B }, right: A },
      { left: { t: "add", a: n(11), b: B }, right: D },
    ];

    const { count, solution } = countSolutions(equations, ["A", "B", "C", "D"]);
    expect(count).toBe(1);
    expect(solution).toEqual({ A: 5, B: 1, C: 10, D: 12 });
  });
});

describe("generateMathEquationsQuestion", () => {
  for (const difficulty of DIFFICULTIES) {
    it(`produces uniquely solvable ${difficulty} systems`, () => {
      for (let i = 0; i < SAMPLES; i++) {
        const seed = seedFor(difficulty, i);
        const question = generateMathEquationsQuestion(seed, difficulty);

        expect(question.variables).toHaveLength(EXPECTED_COUNT[difficulty]);
        expect(question.equations).toHaveLength(EXPECTED_COUNT[difficulty]);
        expect(question.explanation.length).toBeGreaterThan(0);

        // "Each letter can be an integer between 1 and 20."
        for (const name of question.variables) {
          const value = question.solution[name];
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(MIN_VALUE);
          expect(value).toBeLessThanOrEqual(MAX_VALUE);
        }

        // Values must be distinct, so no two letters are interchangeable.
        const values = question.variables.map((n) => question.solution[n]);
        expect(new Set(values).size).toBe(values.length);

        // Rendered output must never leak a NaN or an undefined.
        for (const line of question.equations) {
          expect(line).not.toMatch(/NaN|undefined/);
          expect(line).toContain("=");
        }
        for (const line of question.explanation) {
          expect(line).not.toMatch(/NaN|undefined/);
        }
      }
    });
  }

  it("is deterministic for a given seed", () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 20; i++) {
        const seed = seedFor(difficulty, i);
        const a = generateMathEquationsQuestion(seed, difficulty);
        const b = generateMathEquationsQuestion(seed, difficulty);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      }
    }
  });

  it("uses a variety of equation shapes", () => {
    const shapes = new Set<string>();
    for (let i = 0; i < 120; i++) {
      const question = generateMathEquationsQuestion(seedFor("high", i), "high");
      for (const line of question.equations) {
        shapes.add(line.replace(/\d+/g, "#"));
      }
    }
    expect(shapes.size).toBeGreaterThan(20);
  });
});

describe("renderEquation", () => {
  it("brackets a compound expression that follows a minus", () => {
    const rendered = renderEquation({
      left: {
        t: "sub",
        a: { t: "var", name: "A" },
        b: { t: "add", a: { t: "num", v: 11 }, b: { t: "var", name: "B" } },
      },
      right: { t: "num", v: 2 },
    });
    expect(rendered).toBe("A − (11 + B) = 2");
  });
});

describe("evaluate", () => {
  it("handles division exactly", () => {
    expect(
      evaluate(
        { t: "div", a: { t: "var", name: "B" }, b: { t: "num", v: 2 } },
        { B: 16 },
      ),
    ).toBe(8);
  });
});
