/**
 * Latin Squares generator.
 *
 * Format (from the prep material): a 5x5 grid, letters A-E, each letter once
 * per row and once per column. Some cells are given, one holds a question
 * mark. The test taker picks the letter belonging in that cell.
 *
 * Difficulty is not guessed -- it is *measured*. A guess-free propagation
 * solver records which deductions the question cell actually depended on, and
 * the length of that dependency chain is the difficulty:
 *
 *   low     1 deduction   ("all other letters already appear in its row/column")
 *   medium  2-3           (fill one or two other cells first)
 *   high    4+            (a long chain, as in the official high exercises)
 */

import { createRng, formatSeed, type Rng } from "../rng";
import {
  LATIN_LETTERS,
  LATIN_SIZE,
  type Difficulty,
  type LatinLetter,
  type LatinSquareQuestion,
} from "./types";

type Cell = LatinLetter | null;
type Grid = Cell[][];

const key = (row: number, col: number) => `${row},${col}`;
/** Rows and columns are 1-indexed in all human-facing text. */
const human = (n: number) => n + 1;

/* ------------------------------------------------------------------ *
 * Solver
 * ------------------------------------------------------------------ */

export interface LatinFill {
  row: number;
  col: number;
  letter: LatinLetter;
  text: string;
  /** Keys of *deduced* cells this deduction relied on. */
  prereqs: string[];
}

export interface LatinSolveResult {
  /** True if the question cell was determined without guessing. */
  determined: boolean;
  answer: LatinLetter | null;
  /** Deductions needed for the question cell, in dependency order. */
  chain: LatinFill[];
  /** chain.length -- 1 for a direct deduction. */
  depth: number;
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.slice());
}

function lettersSeen(grid: Grid, row: number, col: number): Set<LatinLetter> {
  const seen = new Set<LatinLetter>();
  for (let i = 0; i < LATIN_SIZE; i++) {
    const inRow = grid[row][i];
    if (inRow) seen.add(inRow);
    const inCol = grid[i][col];
    if (inCol) seen.add(inCol);
  }
  return seen;
}

/**
 * Finds a cell in row `row` or column `col` holding `letter`, preferring a
 * given over a deduced cell so dependency chains stay as short as they
 * honestly are.
 */
function findBlocker(
  grid: Grid,
  row: number,
  col: number,
  letter: LatinLetter,
  deduced: Set<string>,
): string | null {
  let fallback: string | null = null;
  for (let i = 0; i < LATIN_SIZE; i++) {
    if (grid[row][i] === letter) {
      const k = key(row, i);
      if (!deduced.has(k)) return k;
      fallback ??= k;
    }
    if (grid[i][col] === letter) {
      const k = key(i, col);
      if (!deduced.has(k)) return k;
      fallback ??= k;
    }
  }
  return fallback;
}

/** Finds the row holding `letter` in column `col`. */
function findInColumn(
  grid: Grid,
  col: number,
  letter: LatinLetter,
  deduced: Set<string>,
): string | null {
  let fallback: string | null = null;
  for (let r = 0; r < LATIN_SIZE; r++) {
    if (grid[r][col] === letter) {
      const k = key(r, col);
      if (!deduced.has(k)) return k;
      fallback ??= k;
    }
  }
  return fallback;
}

function findInRow(
  grid: Grid,
  row: number,
  letter: LatinLetter,
  deduced: Set<string>,
): string | null {
  let fallback: string | null = null;
  for (let c = 0; c < LATIN_SIZE; c++) {
    if (grid[row][c] === letter) {
      const k = key(row, c);
      if (!deduced.has(k)) return k;
      fallback ??= k;
    }
  }
  return fallback;
}

/** One propagation pass: returns the first deduction found, or null. */
function nextDeduction(
  grid: Grid,
  deduced: Set<string>,
): LatinFill | null {
  // Naked single: a blank cell with exactly one possible letter.
  for (let r = 0; r < LATIN_SIZE; r++) {
    for (let c = 0; c < LATIN_SIZE; c++) {
      if (grid[r][c] !== null) continue;
      const seen = lettersSeen(grid, r, c);
      const candidates = LATIN_LETTERS.filter((l) => !seen.has(l));
      if (candidates.length !== 1) continue;

      const letter = candidates[0];
      const prereqs: string[] = [];
      for (const other of LATIN_LETTERS) {
        if (other === letter) continue;
        const blocker = findBlocker(grid, r, c, other, deduced);
        if (blocker && deduced.has(blocker)) prereqs.push(blocker);
      }
      const others = LATIN_LETTERS.filter((l) => l !== letter).join(", ");
      return {
        row: r,
        col: c,
        letter,
        prereqs,
        text: `Only ${letter} can be inserted in row ${human(r)}, column ${human(
          c,
        )}, because ${others} already appear in that row or column.`,
      };
    }
  }

  // Hidden single in a row: a letter that fits only one blank cell of the row.
  for (let r = 0; r < LATIN_SIZE; r++) {
    const present = new Set(grid[r].filter(Boolean) as LatinLetter[]);
    for (const letter of LATIN_LETTERS) {
      if (present.has(letter)) continue;
      const spots: number[] = [];
      for (let c = 0; c < LATIN_SIZE; c++) {
        if (grid[r][c] !== null) continue;
        let blocked = false;
        for (let rr = 0; rr < LATIN_SIZE; rr++) {
          if (grid[rr][c] === letter) {
            blocked = true;
            break;
          }
        }
        if (!blocked) spots.push(c);
      }
      if (spots.length !== 1) continue;

      const c = spots[0];
      const prereqs: string[] = [];
      for (let other = 0; other < LATIN_SIZE; other++) {
        if (other === c) continue;
        if (grid[r][other] !== null) {
          const k = key(r, other);
          if (deduced.has(k)) prereqs.push(k);
        } else {
          const blocker = findInColumn(grid, other, letter, deduced);
          if (blocker && deduced.has(blocker)) prereqs.push(blocker);
        }
      }
      return {
        row: r,
        col: c,
        letter,
        prereqs,
        text: `In row ${human(r)}, ${letter} is still missing and can only go in column ${human(
          c,
        )}, since ${letter} is already present in the other columns.`,
      };
    }
  }

  // Hidden single in a column.
  for (let c = 0; c < LATIN_SIZE; c++) {
    const present = new Set(
      Array.from({ length: LATIN_SIZE }, (_, r) => grid[r][c]).filter(
        Boolean,
      ) as LatinLetter[],
    );
    for (const letter of LATIN_LETTERS) {
      if (present.has(letter)) continue;
      const spots: number[] = [];
      for (let r = 0; r < LATIN_SIZE; r++) {
        if (grid[r][c] !== null) continue;
        if (!grid[r].includes(letter)) spots.push(r);
      }
      if (spots.length !== 1) continue;

      const r = spots[0];
      const prereqs: string[] = [];
      for (let other = 0; other < LATIN_SIZE; other++) {
        if (other === r) continue;
        if (grid[other][c] !== null) {
          const k = key(other, c);
          if (deduced.has(k)) prereqs.push(k);
        } else {
          const blocker = findInRow(grid, other, letter, deduced);
          if (blocker && deduced.has(blocker)) prereqs.push(blocker);
        }
      }
      return {
        row: r,
        col: c,
        letter,
        prereqs,
        text: `In column ${human(c)}, ${letter} is still missing and can only go in row ${human(
          r,
        )}, since ${letter} is already present in the other rows.`,
      };
    }
  }

  return null;
}

/**
 * Propagates until the question cell is determined (or progress stops), then
 * walks the dependency graph backwards to recover the minimal chain of
 * deductions the question cell actually needed.
 */
export function solveForCell(
  puzzle: Grid,
  qRow: number,
  qCol: number,
): LatinSolveResult {
  const grid = cloneGrid(puzzle);
  const deduced = new Set<string>();
  const fills = new Map<string, LatinFill>();

  let target: LatinFill | null = null;
  for (let guard = 0; guard < LATIN_SIZE * LATIN_SIZE + 1; guard++) {
    const fill = nextDeduction(grid, deduced);
    if (!fill) break;
    const k = key(fill.row, fill.col);
    grid[fill.row][fill.col] = fill.letter;
    deduced.add(k);
    fills.set(k, fill);
    if (fill.row === qRow && fill.col === qCol) {
      target = fill;
      break;
    }
  }

  if (!target) return { determined: false, answer: null, chain: [], depth: Infinity };

  // Transitive closure of everything the target deduction rested on.
  const needed = new Set<string>();
  const stack = [key(qRow, qCol)];
  while (stack.length > 0) {
    const k = stack.pop()!;
    if (needed.has(k)) continue;
    needed.add(k);
    for (const prereq of fills.get(k)?.prereqs ?? []) {
      if (!needed.has(prereq)) stack.push(prereq);
    }
  }

  // Order the chain so prerequisites come before what they unlock.
  const chain: LatinFill[] = [];
  const placed = new Set<string>();
  const remaining = new Set(needed);
  while (remaining.size > 0) {
    let progressed = false;
    for (const k of Array.from(remaining)) {
      const fill = fills.get(k);
      if (!fill) {
        remaining.delete(k);
        progressed = true;
        continue;
      }
      if (fill.prereqs.every((p) => placed.has(p) || !remaining.has(p))) {
        chain.push(fill);
        placed.add(k);
        remaining.delete(k);
        progressed = true;
      }
    }
    if (!progressed) {
      // Cyclic prereqs should be impossible, but never loop forever.
      for (const k of remaining) {
        const fill = fills.get(k);
        if (fill) chain.push(fill);
      }
      break;
    }
  }

  // The question cell is always last.
  const targetKey = key(qRow, qCol);
  const ordered = chain.filter((f) => key(f.row, f.col) !== targetKey);
  ordered.push(target);

  return {
    determined: true,
    answer: target.letter,
    chain: ordered,
    depth: ordered.length,
  };
}

/* ------------------------------------------------------------------ *
 * Generation
 * ------------------------------------------------------------------ */

/** Random valid Latin square: shuffle rows, columns and symbol labels. */
export function randomLatinSquare(rng: Rng): LatinLetter[][] {
  const rowOrder = rng.shuffle([0, 1, 2, 3, 4]);
  const colOrder = rng.shuffle([0, 1, 2, 3, 4]);
  const symbols = rng.shuffle(LATIN_LETTERS as readonly LatinLetter[]);

  return rowOrder.map((r) =>
    colOrder.map((c) => symbols[(r + c) % LATIN_SIZE]),
  );
}

const DEPTH_BANDS: Record<Difficulty, { min: number; max: number }> = {
  low: { min: 1, max: 1 },
  medium: { min: 2, max: 3 },
  high: { min: 4, max: 12 },
};

const GIVEN_RANGE: Record<Difficulty, [number, number]> = {
  low: [11, 14],
  medium: [10, 13],
  high: [9, 12],
};

const MAX_ATTEMPTS = 600;

export function generateLatinSquareQuestion(
  seed: string,
  difficulty: Difficulty,
): LatinSquareQuestion {
  const band = DEPTH_BANDS[difficulty];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = createRng(seed, attempt);
    const solution = randomLatinSquare(rng);
    const qRow = rng.int(0, LATIN_SIZE - 1);
    const qCol = rng.int(0, LATIN_SIZE - 1);

    const grid: Grid = cloneGrid(solution);
    grid[qRow][qCol] = null;

    const cells: Array<[number, number]> = [];
    for (let r = 0; r < LATIN_SIZE; r++) {
      for (let c = 0; c < LATIN_SIZE; c++) {
        if (r === qRow && c === qCol) continue;
        cells.push([r, c]);
      }
    }

    // Bias the removal order. Emptying the question cell's own row and column
    // is what forces a longer deduction chain, so strip those first whenever we
    // want depth. For `low` we do the opposite and keep the cross intact, so
    // the answer stays a one-step read.
    const inCross = cells.filter(([r, c]) => r === qRow || c === qCol);
    const outside = cells.filter(([r, c]) => r !== qRow && c !== qCol);
    const order =
      difficulty === "low"
        ? [...rng.shuffle(outside), ...rng.shuffle(inCross)]
        : [...rng.shuffle(inCross), ...rng.shuffle(outside)];

    const [minGivens, maxGivens] = GIVEN_RANGE[difficulty];
    const targetGivens = rng.int(minGivens, maxGivens);

    // Greedy removal always runs up against whatever cap it is given, so give
    // each question its own target inside the band. Otherwise every medium
    // question would land on exactly the same depth. `high` is open-ended, so
    // it just takes the band ceiling.
    const cap = difficulty === "high" ? band.max : rng.int(band.min, band.max);

    let givens = LATIN_SIZE * LATIN_SIZE - 1;
    for (const [r, c] of order) {
      if (givens <= targetGivens) break;
      const saved = grid[r][c];
      grid[r][c] = null;
      const trial = solveForCell(grid, qRow, qCol);
      if (trial.determined && trial.depth <= cap) {
        givens--;
      } else {
        grid[r][c] = saved;
      }
    }

    const result = solveForCell(grid, qRow, qCol);
    if (!result.determined) continue;
    if (result.depth < band.min || result.depth > band.max) continue;
    if (result.answer !== solution[qRow][qCol]) continue;

    const explanation = result.chain.map((fill, index) =>
      index === result.chain.length - 1
        ? `At the question mark: ${fill.text}`
        : fill.text,
    );

    return {
      seed,
      taskType: "latin_squares",
      difficulty,
      grid,
      questionCell: [qRow, qCol],
      answer: result.answer!,
      solution,
      explanation,
    };
  }

  throw new Error(
    `Could not generate a ${difficulty} Latin Square for seed ${seed} in ${MAX_ATTEMPTS} attempts`,
  );
}

/** Convenience for tests and tooling. */
export function latinSeed(difficulty: Difficulty, payload: string): string {
  return formatSeed("latin_squares", difficulty, payload);
}
