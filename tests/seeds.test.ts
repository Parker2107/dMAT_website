import { afterEach, describe, expect, it, vi } from "vitest";

import { generateQuestion } from "../lib/generators";
import {
  DIFFICULTIES,
  TASK_TYPES,
  type Difficulty,
  type TaskType,
} from "../lib/generators/types";
import { createRng, formatSeed, parseSeed, randomSeed } from "../lib/rng";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("seed format", () => {
  it("round-trips every task type and difficulty", () => {
    for (const taskType of TASK_TYPES) {
      for (const difficulty of DIFFICULTIES) {
        const seed = randomSeed(taskType, difficulty);
        const parsed = parseSeed(seed);
        expect(parsed).not.toBeNull();
        expect(parsed!.taskType).toBe(taskType);
        expect(parsed!.difficulty).toBe(difficulty);
        expect(parsed!.seed).toBe(seed);
      }
    }
  });

  it("accepts a seed typed in lower case or with stray spaces", () => {
    const seed = formatSeed("figure_sequences", "high", "7K3QM2");
    expect(parseSeed(" fs-h-7k3qm2 ")!.seed).toBe(seed);
  });

  it("rejects malformed seeds cleanly instead of throwing", () => {
    const bad = [
      "",
      "nonsense",
      "XX-H-7K3QM2", // unknown task code
      "FS-X-7K3QM2", // unknown difficulty
      "FS-H-", // no payload
      "FS-H-7K3QM!", // payload character outside the alphabet
      "FS-H-7K3QM2-EXTRA",
      "FSH7K3QM2",
      "FS-H-IL0U", // ambiguous characters are not in the alphabet
    ];
    for (const value of bad) {
      expect(parseSeed(value)).toBeNull();
    }
  });
});

describe("createRng", () => {
  it("is deterministic and stable across calls", () => {
    const a = createRng("FS-H-7K3QM2");
    const b = createRng("FS-H-7K3QM2");
    const first = Array.from({ length: 40 }, () => a.int(0, 999));
    const second = Array.from({ length: 40 }, () => b.int(0, 999));
    expect(first).toEqual(second);
  });

  it("gives different streams for different salts", () => {
    const base = createRng("FS-H-7K3QM2");
    const salted = createRng("FS-H-7K3QM2", 1);
    const first = Array.from({ length: 20 }, () => base.int(0, 999));
    const second = Array.from({ length: 20 }, () => salted.int(0, 999));
    expect(first).not.toEqual(second);
  });

  it("stays within bounds and shuffles without dropping items", () => {
    const rng = createRng("bounds");
    for (let i = 0; i < 2000; i++) {
      const value = rng.int(3, 9);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(9);
    }
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = rng.shuffle(items);
    expect(shuffled).toHaveLength(items.length);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // input untouched
  });
});

describe("generation purity", () => {
  it("never reaches Math.random once a seed exists", () => {
    // If a generator called Math.random the question would differ from run to
    // run and seeds would stop being reproducible, so make it fatal.
    const spy = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Math.random() must not be called inside lib/generators");
    });

    const cases: Array<[TaskType, Difficulty]> = [];
    for (const taskType of TASK_TYPES) {
      for (const difficulty of DIFFICULTIES) cases.push([taskType, difficulty]);
    }

    for (const [taskType, difficulty] of cases) {
      for (let i = 0; i < 12; i++) {
        const seed = formatSeed(
          taskType,
          difficulty,
          `P${String(i).padStart(5, "0")}`,
        );
        expect(() => generateQuestion(taskType, difficulty, seed)).not.toThrow();
      }
    }

    expect(spy).not.toHaveBeenCalled();
  });

  it("regenerates an identical question from the same seed", () => {
    for (const taskType of TASK_TYPES) {
      for (const difficulty of DIFFICULTIES) {
        const seed = formatSeed(taskType, difficulty, "R1234Z");
        const first = generateQuestion(taskType, difficulty, seed);
        const second = generateQuestion(taskType, difficulty, seed);
        expect(JSON.stringify(second)).toBe(JSON.stringify(first));
        expect(first.seed).toBe(seed);
        expect(first.taskType).toBe(taskType);
        expect(first.difficulty).toBe(difficulty);
      }
    }
  });
});
