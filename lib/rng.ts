/**
 * Seeded randomness + the seed format.
 *
 * Every question in the app is fully determined by its seed string, so a seed
 * is a portable handle on one exact question. Nothing inside lib/generators/
 * may call Math.random() -- all draws go through an Rng created here.
 *
 * Seed format:  FS-H-7K3QM2
 *               ^  ^ ^
 *               |  | payload (6 chars, Crockford-ish base32)
 *               |  difficulty: L | M | H
 *               task: FS | ME | LS
 */

import type { Difficulty, TaskType } from "./generators/types";

/** 32 symbols, with I / L / O / U removed so seeds survive being read aloud. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const PAYLOAD_LENGTH = 6;

const TASK_TO_CODE: Record<TaskType, string> = {
  figure_sequences: "FS",
  math_equations: "ME",
  latin_squares: "LS",
};

const DIFFICULTY_TO_CODE: Record<Difficulty, string> = {
  low: "L",
  medium: "M",
  high: "H",
};

const CODE_TO_TASK: Record<string, TaskType> = {
  FS: "figure_sequences",
  ME: "math_equations",
  LS: "latin_squares",
};

const CODE_TO_DIFFICULTY: Record<string, Difficulty> = {
  L: "low",
  M: "medium",
  H: "high",
};

export interface ParsedSeed {
  taskType: TaskType;
  difficulty: Difficulty;
  payload: string;
  seed: string;
}

export function formatSeed(
  taskType: TaskType,
  difficulty: Difficulty,
  payload: string,
): string {
  return `${TASK_TO_CODE[taskType]}-${DIFFICULTY_TO_CODE[difficulty]}-${payload}`;
}

/** Returns null for anything that is not a well-formed seed. */
export function parseSeed(raw: string): ParsedSeed | null {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, "");
  const match = /^([A-Z]{2})-([LMH])-([0-9A-Z]{2,16})$/.exec(cleaned);
  if (!match) return null;

  const taskType = CODE_TO_TASK[match[1]];
  const difficulty = CODE_TO_DIFFICULTY[match[2]];
  if (!taskType || !difficulty) return null;

  const payload = match[3];
  for (const ch of payload) {
    if (!ALPHABET.includes(ch)) return null;
  }

  return { taskType, difficulty, payload, seed: formatSeed(taskType, difficulty, payload) };
}

/**
 * Mints a brand-new random seed. This is the one place Math.random() is
 * allowed -- once a seed exists, everything downstream is deterministic.
 */
export function randomSeed(taskType: TaskType, difficulty: Difficulty): string {
  let payload = "";
  for (let i = 0; i < PAYLOAD_LENGTH; i++) {
    payload += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return formatSeed(taskType, difficulty, payload);
}

/** FNV-1a, 32-bit. Deterministic across platforms. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 -- small, fast, good enough distribution for puzzle generation. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** Returns a new shuffled array; does not mutate the input. */
  shuffle<T>(items: readonly T[]): T[];
  /** n distinct items, in random order. */
  sample<T>(items: readonly T[], n: number): T[];
  bool(probability?: number): boolean;
}

/**
 * Builds an Rng from a seed string. `salt` lets a generator take a fresh,
 * still-deterministic draw when a candidate question fails validation --
 * pass the attempt number.
 */
export function createRng(seed: string, salt: string | number = ""): Rng {
  const next = mulberry32(hashString(`${seed}::${salt}`));

  const rng: Rng = {
    next,
    int(min: number, max: number): number {
      if (max < min) throw new Error(`Rng.int: max (${max}) < min (${min})`);
      return min + Math.floor(next() * (max - min + 1));
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error("Rng.pick: empty array");
      return items[Math.floor(next() * items.length)];
    },
    shuffle<T>(items: readonly T[]): T[] {
      const copy = items.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    sample<T>(items: readonly T[], n: number): T[] {
      if (n > items.length) {
        throw new Error(`Rng.sample: asked for ${n} of ${items.length}`);
      }
      return rng.shuffle(items).slice(0, n);
    },
    bool(probability = 0.5): boolean {
      return next() < probability;
    },
  };

  return rng;
}
