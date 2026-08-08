/**
 * Dev-only ASCII preview of generated questions, so a generated question can be
 * eyeballed against the official prep material without booting the UI.
 *
 *   npm run preview -- latin low
 */

import { generateLatinSquareQuestion } from "../lib/generators/latinSquares";
import { generateMathEquationsQuestion } from "../lib/generators/mathEquations";
import { generateFigureSequenceQuestion } from "../lib/generators/figureSequences";
import { parseSeed, randomSeed } from "../lib/rng";
import { MATRIX_SIZE, type Difficulty, type Frame } from "../lib/generators/types";

const kind = process.argv[2] ?? "latin";
const difficulty = (process.argv[3] ?? "low") as Difficulty;
const count = Number(process.argv[4] ?? 2);

function printLatin(difficulty: Difficulty, fixedSeed?: string) {
  const seed = fixedSeed ?? randomSeed("latin_squares", difficulty);
  const q = generateLatinSquareQuestion(seed, difficulty);
  const [qr, qc] = q.questionCell;

  console.log(`\n=== Latin Square | ${difficulty} | ${seed} ===`);
  for (let r = 0; r < 5; r++) {
    const cells = q.grid[r].map((cell, c) =>
      r === qr && c === qc ? "?" : (cell ?? " "),
    );
    console.log("  | " + cells.join(" | ") + " |");
  }
  const givens = q.grid.flat().filter(Boolean).length;
  console.log(`  answer: ${q.answer}   givens: ${givens}   steps: ${q.explanation.length}`);

  console.log("  completed square:");
  q.solution.forEach((row) => console.log("    | " + row.join(" | ") + " |"));
  const valid = q.solution.every(
    (row, i) =>
      new Set(row).size === 5 &&
      new Set(q.solution.map((r) => r[i])).size === 5,
  );
  console.log(`  valid latin square: ${valid}`);

  q.explanation.forEach((line, i) => console.log(`   ${i + 1}. ${line}`));
}

function stats() {
  for (const d of ["low", "medium", "high"] as Difficulty[]) {
    const depths: number[] = [];
    const givens: number[] = [];
    for (let i = 0; i < 200; i++) {
      const q = generateLatinSquareQuestion(randomSeed("latin_squares", d), d);
      depths.push(q.explanation.length);
      givens.push(q.grid.flat().filter(Boolean).length);
    }
    const tally = (xs: number[]) => {
      const m = new Map<number, number>();
      for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join("  ");
    };
    console.log(`${d.padEnd(7)} depth  ${tally(depths)}`);
    console.log(`${"".padEnd(7)} givens ${tally(givens)}`);
  }
}

function printMath(difficulty: Difficulty, fixedSeed?: string) {
  const seed = fixedSeed ?? randomSeed("math_equations", difficulty);
  const q = generateMathEquationsQuestion(seed, difficulty);
  console.log(`\n=== Mathematical Equations | ${difficulty} | ${seed} ===`);
  q.equations.forEach((line) => console.log(`    ${line}`));
  console.log(
    `  solution: ${q.variables.map((n) => `${n} = ${q.solution[n]}`).join(", ")}`,
  );
  q.explanation.forEach((line) => console.log(`   - ${line}`));
}

function renderFrames(frames: Frame[], labels: string[]) {
  const glyphChar = (g: Frame[number]) =>
    `${g.shape[0].toUpperCase()}${{ 0: "^", 90: ">", 180: "v", 270: "<" }[g.rotation as 0]}`;
  const rows: string[] = [];
  rows.push(labels.map((l) => l.padEnd(MATRIX_SIZE * 3 + 2)).join("  "));
  for (let r = 0; r < MATRIX_SIZE; r++) {
    const line = frames.map((frame) => {
      const cells: string[] = [];
      for (let c = 0; c < MATRIX_SIZE; c++) {
        const g = frame.find((x) => x.row === r && x.col === c);
        cells.push(g ? glyphChar(g) : " ·");
      }
      return "|" + cells.join(" ") + "|";
    });
    rows.push(line.join("  "));
  }
  console.log(rows.join("\n"));
}

function printFigures(difficulty: Difficulty, fixedSeed?: string) {
  const seed = fixedSeed ?? randomSeed("figure_sequences", difficulty);
  const q = generateFigureSequenceQuestion(seed, difficulty);
  console.log(`\n=== Figure Sequences | ${difficulty} | ${seed} ===`);
  console.log("Series (matrices 1-4 shown, 5 and 6 hidden):");
  renderFrames(q.given, ["matrix 1", "matrix 2", "matrix 3", "matrix 4"]);
  for (const image of [0, 1] as const) {
    console.log(`\nOptions for Image ${image + 1}  (correct: Matrix ${q.answer[image] + 1})`);
    renderFrames(q.options[image], ["Matrix 1", "Matrix 2", "Matrix 3"]);
  }
  console.log("\nSolution:");
  q.explanation.forEach((line) => console.log(`   - ${line}`));
}

if (kind === "seed") {
  // Reproduce one exact question from a seed, e.g. `npm run preview -- seed LS-M-DH63RE`.
  const parsed = parseSeed(process.argv[3] ?? "");
  if (!parsed) throw new Error(`not a valid seed: ${process.argv[3]}`);
  if (parsed.taskType === "latin_squares") {
    printLatin(parsed.difficulty, parsed.seed);
  } else if (parsed.taskType === "math_equations") {
    printMath(parsed.difficulty, parsed.seed);
  } else {
    printFigures(parsed.difficulty, parsed.seed);
  }
} else if (kind === "json") {
  // Machine-readable dump, consumed by scripts/render_question.py.
  const seed = process.argv[5] ?? randomSeed("figure_sequences", difficulty);
  console.log(JSON.stringify(generateFigureSequenceQuestion(seed, difficulty)));
} else if (kind === "stats") {
  stats();
} else if (kind === "figures") {
  for (let i = 0; i < count; i++) printFigures(difficulty);
} else if (kind === "math") {
  for (let i = 0; i < count; i++) printMath(difficulty);
} else {
  for (let i = 0; i < count; i++) printLatin(difficulty);
}
