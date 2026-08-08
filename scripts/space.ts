/**
 * Estimates how many genuinely distinct questions each generator can produce.
 *
 *   npm run space
 *
 * Draws N random seeds per (task type, difficulty), canonicalises each question
 * (dropping the seed itself), and counts how many are distinct. The number of
 * repeats is what reveals the size of the underlying space: with M possible
 * questions and N draws, the expected number of distinct results is
 *
 *     D = M · (1 − e^(−N/M))
 *
 * so solving that for M gives an estimate. Seeing zero repeats only puts a
 * lower bound on M, which is reported as such.
 */

import { createHash } from "node:crypto";

import { generateQuestion } from "../lib/generators";
import { DIFFICULTIES, TASK_LABELS, TASK_TYPES } from "../lib/generators/types";
import type { Difficulty, Question, TaskType } from "../lib/generators/types";
import { randomSeed } from "../lib/rng";

const SAMPLES = Number(process.argv[2] ?? 4000);

/**
 * Everything that makes a question what it is, except which seed produced it.
 * Hashed to 64 bits so a large run does not hold gigabytes of JSON in memory;
 * accidental hash collisions at these sample sizes are negligible.
 */
function canonical(question: Question): string {
  const { seed: _seed, explanation: _explanation, ...rest } = question;
  return createHash("sha1").update(JSON.stringify(rest)).digest("hex").slice(0, 16);
}

/** Solves D = M(1 − e^(−N/M)) for M by bisection. */
function estimatePopulation(samples: number, distinct: number): number {
  if (distinct >= samples) return Infinity;
  const expected = (m: number) => m * (1 - Math.exp(-samples / m));
  let low = 1;
  let high = 1e15;
  for (let i = 0; i < 200; i++) {
    const mid = Math.sqrt(low * high);
    if (expected(mid) < distinct) low = mid;
    else high = mid;
  }
  return Math.sqrt(low * high);
}

function human(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)} trillion`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} billion`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)} million`;
  if (value >= 1e3) return `${Math.round(value / 1e3)} thousand`;
  return String(Math.round(value));
}

/** 32-symbol alphabet, 6-character payload. */
const SEED_SPACE = 32 ** 6;

console.log(
  `Drawing ${SAMPLES.toLocaleString()} random seeds per task type and difficulty.\n`,
);
console.log(
  "task type              diff     distinct   repeats   estimated distinct questions",
);
console.log("-".repeat(84));

for (const taskType of TASK_TYPES as TaskType[]) {
  for (const difficulty of DIFFICULTIES as Difficulty[]) {
    const seen = new Set<string>();
    const start = Date.now();
    for (let i = 0; i < SAMPLES; i++) {
      const seed = randomSeed(taskType, difficulty);
      seen.add(canonical(generateQuestion(taskType, difficulty, seed)));
    }
    const elapsed = Date.now() - start;
    const repeats = SAMPLES - seen.size;
    const estimate = estimatePopulation(SAMPLES, seen.size);
    const label = Number.isFinite(estimate)
      ? `~${human(estimate)}`
      : `> ${human(SAMPLES * SAMPLES)} (no repeats seen)`;

    console.log(
      `${TASK_LABELS[taskType].padEnd(23)}${difficulty.padEnd(9)}` +
        `${String(seen.size).padStart(8)}${String(repeats).padStart(10)}   ${label}` +
        `   [${(elapsed / SAMPLES).toFixed(2)} ms each]`,
    );
  }
}

console.log(
  `\nSeed space is ${human(SEED_SPACE)} per task type and difficulty ` +
    `(32^6), i.e. ${human(SEED_SPACE * 9)} seeds overall.`,
);
