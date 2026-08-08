/**
 * Figure Sequences generator.
 *
 * Format (recovered from the prep material, including the embedded artwork):
 * a 4x4 matrix. Matrices 1-4 are shown, matrices 5 and 6 are hidden. Below
 * them sit three response options for Image 1 and three for Image 2.
 *
 * The rules, verbatim from the instructions:
 *   - Figures can change their colour.
 *   - Figures can rotate around their own axis.
 *   - Figures can move in the matrix. Vertical, horizontal and diagonal
 *     movements are allowed. Figures cannot change from one diagonal movement
 *     to another type of movement.
 *   - Figures can also change their movement, colour or orientation by x + 1.
 *   - Figures cannot disappear or overlap.
 *   - Figures cannot leave the matrix. If they come up against an outer
 *     boundary, they can EITHER bounce off OR move along the outer boundary.
 *
 * Generation places one figure at a time and simulates the whole series, so
 * the "cannot overlap" and "cannot leave the matrix" rules are enforced by
 * construction rather than hoped for.
 */

import { createRng, formatSeed, type Rng } from "../rng";
import {
  ASYMMETRIC_SHAPES,
  COLOUR_LABELS,
  MATRIX_SIZE,
  SYMMETRIC_SHAPES,
  type ColourId,
  type Difficulty,
  type FigureSequenceQuestion,
  type Frame,
  type Glyph,
  type ShapeId,
} from "./types";

/** Frames 1-6 are the series; 7 and 8 exist only to build "one step ahead" distractors. */
const SIMULATED_FRAMES = 8;
const VISIBLE_FRAMES = 6;
const GIVEN_FRAMES = 4;
const OPTIONS_PER_IMAGE = 3;

const COLOUR_POOL: ColourId[] = [
  "black",
  "white",
  "pink",
  "yellow",
  "orange",
  "green",
  "blue",
];

/* ------------------------------------------------------------------ *
 * Geometry
 * ------------------------------------------------------------------ */

/** The 12 border cells of the matrix, clockwise from the top-left corner. */
function buildRing(size: number): Array<[number, number]> {
  const ring: Array<[number, number]> = [];
  for (let c = 0; c < size; c++) ring.push([0, c]);
  for (let r = 1; r < size; r++) ring.push([r, size - 1]);
  for (let c = size - 2; c >= 0; c--) ring.push([size - 1, c]);
  for (let r = size - 2; r >= 1; r--) ring.push([r, 0]);
  return ring;
}

const RING = buildRing(MATRIX_SIZE);

const DIRECTIONS: Array<[number, number]> = [
  [-1, 0], // up
  [0, 1], // right
  [1, 0], // down
  [0, -1], // left
];

const DIRECTION_NAMES = ["up", "right", "down", "left"];

const inBounds = (row: number, col: number) =>
  row >= 0 && row < MATRIX_SIZE && col >= 0 && col < MATRIX_SIZE;

/* ------------------------------------------------------------------ *
 * Rules
 * ------------------------------------------------------------------ */

export type Motion =
  | {
      kind: "line";
      axis: "row" | "col";
      /** The row index for a horizontal mover, column index for a vertical one. */
      fixed: number;
      position: number;
      direction: 1 | -1;
      step: number;
      growth: boolean;
    }
  | {
      kind: "diagonal";
      row: number;
      col: number;
      dRow: 1 | -1;
      dCol: 1 | -1;
    }
  | {
      kind: "perimeter";
      index: number;
      direction: 1 | -1;
      step: number;
      growth: boolean;
    }
  | {
      kind: "cycle";
      row: number;
      col: number;
      directions: Array<[number, number]>;
      directionNames: string[];
      offset: number;
    };

export type RotationRule =
  | { kind: "none" }
  | { kind: "fixed"; delta: 90 | -90 }
  | { kind: "growth"; direction: 1 | -1 };

export type ColourRule =
  | { kind: "fixed"; colour: ColourId }
  | { kind: "cycle"; palette: ColourId[] };

export interface SymbolRule {
  shape: ShapeId;
  motion: Motion;
  rotation: RotationRule;
  colour: ColourRule;
  startRotation: number;
}

export interface GlyphState {
  row: number;
  col: number;
  rotation: number;
  colour: ColourId;
}

/* ------------------------------------------------------------------ *
 * Simulation
 * ------------------------------------------------------------------ */

/** One unit step along a line, bouncing off the outer boundary. */
function stepLine(
  position: number,
  direction: 1 | -1,
): { position: number; direction: 1 | -1 } {
  let dir = direction;
  if (!inBounds(0, position + dir)) dir = (dir * -1) as 1 | -1;
  return { position: position + dir, direction: dir };
}

/**
 * One unit step along a diagonal. On meeting a boundary the figure reverses
 * both components, retracing the same diagonal -- which is what the official
 * solutions describe ("returns to the starting position in the same way") and
 * also honours "figures cannot change from one diagonal movement to another
 * type of movement".
 */
function stepDiagonal(
  row: number,
  col: number,
  dRow: 1 | -1,
  dCol: 1 | -1,
): { row: number; col: number; dRow: 1 | -1; dCol: 1 | -1 } {
  let dr = dRow;
  let dc = dCol;
  if (!inBounds(row + dr, col + dc)) {
    dr = (dr * -1) as 1 | -1;
    dc = (dc * -1) as 1 | -1;
  }
  return { row: row + dr, col: col + dc, dRow: dr, dCol: dc };
}

function motionCell(motion: Motion): [number, number] {
  switch (motion.kind) {
    case "line":
      return motion.axis === "row"
        ? [motion.fixed, motion.position]
        : [motion.position, motion.fixed];
    case "diagonal":
      return [motion.row, motion.col];
    case "perimeter":
      return RING[((motion.index % RING.length) + RING.length) % RING.length];
    case "cycle":
      return [motion.row, motion.col];
  }
}

/** Advances the motion across one matrix-to-matrix transition. */
function advanceMotion(motion: Motion, transition: number): Motion | null {
  switch (motion.kind) {
    case "line": {
      const steps = motion.growth ? transition : motion.step;
      let { position, direction } = motion;
      for (let i = 0; i < steps; i++) {
        const next = stepLine(position, direction);
        position = next.position;
        direction = next.direction;
      }
      return { ...motion, position, direction };
    }
    case "diagonal": {
      const next = stepDiagonal(motion.row, motion.col, motion.dRow, motion.dCol);
      return { ...motion, ...next };
    }
    case "perimeter": {
      const steps = motion.growth ? transition : motion.step;
      const index = motion.index + motion.direction * steps;
      return { ...motion, index };
    }
    case "cycle": {
      const [dRow, dCol] =
        motion.directions[(motion.offset + transition - 1) % motion.directions.length];
      const row = motion.row + dRow;
      const col = motion.col + dCol;
      if (!inBounds(row, col)) return null;
      return { ...motion, row, col };
    }
  }
}

function rotationAt(rule: RotationRule, start: number, frameIndex: number): number {
  let total = start;
  switch (rule.kind) {
    case "none":
      break;
    case "fixed":
      total += rule.delta * frameIndex;
      break;
    case "growth":
      // "always turns x + 1 times to the right by 90 degrees": one quarter turn
      // across the first transition, two across the second, and so on.
      total += rule.direction * 90 * ((frameIndex * (frameIndex + 1)) / 2);
      break;
  }
  return ((total % 360) + 360) % 360;
}

function colourAt(rule: ColourRule, frameIndex: number): ColourId {
  if (rule.kind === "fixed") return rule.colour;
  return rule.palette[frameIndex % rule.palette.length];
}

/** Full trajectory for one figure, or null if it would leave the matrix. */
export function simulateSymbol(
  rule: SymbolRule,
  frames: number = SIMULATED_FRAMES,
): GlyphState[] | null {
  const states: GlyphState[] = [];
  let motion: Motion = rule.motion;

  for (let frameIndex = 0; frameIndex < frames; frameIndex++) {
    if (frameIndex > 0) {
      const next = advanceMotion(motion, frameIndex);
      if (!next) return null;
      motion = next;
    }
    const [row, col] = motionCell(motion);
    if (!inBounds(row, col)) return null;
    states.push({
      row,
      col,
      rotation: rotationAt(rule.rotation, rule.startRotation, frameIndex),
      colour: colourAt(rule.colour, frameIndex),
    });
  }

  return states;
}

/* ------------------------------------------------------------------ *
 * Frame helpers
 * ------------------------------------------------------------------ */

function toGlyph(shape: ShapeId, state: GlyphState): Glyph {
  return {
    shape,
    colour: state.colour,
    row: state.row,
    col: state.col,
    rotation: state.rotation,
  };
}

/** Stable key so two frames can be compared regardless of figure order. */
export function frameKey(frame: Frame): string {
  return frame
    .map((g) => `${g.shape}:${g.colour}:${g.row}:${g.col}:${g.rotation}`)
    .sort()
    .join("|");
}

function hasOverlap(frame: Frame): boolean {
  const seen = new Set<string>();
  for (const glyph of frame) {
    const cell = `${glyph.row},${glyph.col}`;
    if (seen.has(cell)) return true;
    seen.add(cell);
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * Rule construction
 * ------------------------------------------------------------------ */

interface Budget {
  symbols: number;
  maxRotating: number;
  maxColourCycling: number;
  allowGrowth: boolean;
  maxStep: number;
}

const BUDGETS: Record<Difficulty, Budget> = {
  // Official low exercises: a single figure on a simple bouncing path.
  low: { symbols: 1, maxRotating: 0, maxColourCycling: 0, allowGrowth: false, maxStep: 1 },
  // Official medium exercises: three figures, one rotating, one changing colour.
  medium: { symbols: 3, maxRotating: 1, maxColourCycling: 1, allowGrowth: false, maxStep: 2 },
  // Official high exercises: four figures, several rotating and cycling colour,
  // and one x+1 movement.
  high: { symbols: 4, maxRotating: 2, maxColourCycling: 2, allowGrowth: true, maxStep: 2 },
};

function randomMotion(rng: Rng, budget: Budget, allowGrowth: boolean): Motion {
  const kinds: Motion["kind"][] =
    budget.symbols === 1
      ? ["line", "diagonal", "perimeter"]
      : ["line", "diagonal", "perimeter", "cycle"];
  const kind = rng.pick(kinds);

  switch (kind) {
    case "line": {
      const axis = rng.pick(["row", "col"] as const);
      return {
        kind: "line",
        axis,
        fixed: rng.int(0, MATRIX_SIZE - 1),
        position: rng.int(0, MATRIX_SIZE - 1),
        direction: rng.pick([1, -1] as const),
        // Always one field at a time. A larger step that bounces off a wall of
        // a 4-wide matrix lands back where it started, so the figure looks
        // stationary for a matrix -- and every line mover in the official
        // exercises moves "by one field" anyway. Step sizes above one are only
        // ever attested on the outer border, which cycles instead of bouncing.
        step: 1,
        growth: false,
      };
    }
    case "diagonal":
      return {
        kind: "diagonal",
        row: rng.int(0, MATRIX_SIZE - 1),
        col: rng.int(0, MATRIX_SIZE - 1),
        dRow: rng.pick([1, -1] as const),
        dCol: rng.pick([1, -1] as const),
      };
    case "perimeter":
      return {
        kind: "perimeter",
        index: rng.int(0, RING.length - 1),
        direction: rng.pick([1, -1] as const),
        step: rng.int(1, budget.maxStep),
        growth: allowGrowth && rng.bool(0.5),
      };
    case "cycle": {
      // The official exercises use a four-step loop such as "left, up, right,
      // down" -- the compass directions taken in order, either way round.
      const clockwise = rng.bool();
      const start = rng.int(0, 3);
      const order = [0, 1, 2, 3].map((i) =>
        clockwise ? (start + i) % 4 : (start - i + 8) % 4,
      );
      return {
        kind: "cycle",
        row: rng.int(0, MATRIX_SIZE - 1),
        col: rng.int(0, MATRIX_SIZE - 1),
        directions: order.map((i) => DIRECTIONS[i]),
        directionNames: order.map((i) => DIRECTION_NAMES[i]),
        offset: 0,
      };
    }
  }
}

/* ------------------------------------------------------------------ *
 * Generation
 * ------------------------------------------------------------------ */

const MAX_ATTEMPTS = 240;
const MAX_SYMBOL_TRIES = 160;

export function generateFigureSequenceQuestion(
  seed: string,
  difficulty: Difficulty,
): FigureSequenceQuestion {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = createRng(seed, attempt);
    const built = tryBuild(rng, difficulty, seed);
    if (built) return built;
  }
  throw new Error(
    `Could not generate a ${difficulty} figure sequence for seed ${seed} in ${MAX_ATTEMPTS} attempts`,
  );
}

function tryBuild(
  rng: Rng,
  difficulty: Difficulty,
  seed: string,
): FigureSequenceQuestion | null {
  const budget = BUDGETS[difficulty];

  const rules: SymbolRule[] = [];
  const trajectories: GlyphState[][] = [];
  const usedShapes = new Set<ShapeId>();
  const usedCells: Array<Set<string>> = Array.from(
    { length: SIMULATED_FRAMES },
    () => new Set<string>(),
  );

  let rotatingLeft = budget.maxRotating;
  let colourCyclingLeft = budget.maxColourCycling;
  let growthLeft = budget.allowGrowth ? 1 : 0;

  for (let symbolIndex = 0; symbolIndex < budget.symbols; symbolIndex++) {
    let placed = false;

    for (let tries = 0; tries < MAX_SYMBOL_TRIES && !placed; tries++) {
      const wantsRotation = rotatingLeft > 0 && rng.bool(0.6);
      // Only a figure whose orientation is actually visible may be given a
      // rotation rule -- a rotating square or circle is unanswerable.
      const shapePool = (wantsRotation ? ASYMMETRIC_SHAPES : [...ASYMMETRIC_SHAPES, ...SYMMETRIC_SHAPES])
        .filter((s) => !usedShapes.has(s));
      if (shapePool.length === 0) return null;

      const shape = rng.pick(shapePool);
      const useGrowth = growthLeft > 0 && rng.bool(0.5);
      const motion = randomMotion(rng, budget, useGrowth);

      const rotation: RotationRule = wantsRotation
        ? rng.bool(0.75)
          ? { kind: "fixed", delta: rng.pick([90, -90] as const) }
          : { kind: "growth", direction: rng.pick([1, -1] as const) }
        : { kind: "none" };

      const wantsColourCycle = colourCyclingLeft > 0 && rng.bool(0.6);
      const colour: ColourRule = wantsColourCycle
        ? { kind: "cycle", palette: rng.sample(COLOUR_POOL, rng.int(2, 3)) }
        : { kind: "fixed", colour: rng.pick(COLOUR_POOL) };

      const rule: SymbolRule = {
        shape,
        motion,
        rotation,
        colour,
        startRotation: rng.pick([0, 90, 180, 270]),
      };

      const states = simulateSymbol(rule);
      if (!states) continue;

      // "Figures cannot overlap" -- checked against every figure already placed,
      // across every frame of the series.
      let collides = false;
      for (let f = 0; f < SIMULATED_FRAMES && !collides; f++) {
        if (usedCells[f].has(`${states[f].row},${states[f].col}`)) collides = true;
      }
      if (collides) continue;

      // A figure that never moves within the visible series gives nothing away
      // and makes the question ambiguous.
      const visited = new Set(
        states.slice(0, VISIBLE_FRAMES).map((s) => `${s.row},${s.col}`),
      );
      if (visited.size < 2) continue;

      // Nor may it stall: standing still for one matrix reads as "no rule" and
      // makes the continuation guesswork.
      let stalls = false;
      for (let f = 1; f < SIMULATED_FRAMES && !stalls; f++) {
        if (
          states[f].row === states[f - 1].row &&
          states[f].col === states[f - 1].col
        ) {
          stalls = true;
        }
      }
      if (stalls) continue;

      for (let f = 0; f < SIMULATED_FRAMES; f++) {
        usedCells[f].add(`${states[f].row},${states[f].col}`);
      }
      usedShapes.add(shape);
      rules.push(rule);
      trajectories.push(states);
      if (rotation.kind !== "none") rotatingLeft--;
      if (colour.kind === "cycle") colourCyclingLeft--;
      if (motion.kind === "perimeter" && motion.growth) growthLeft--;
      placed = true;
    }

    if (!placed) return null;
  }

  const frames: Frame[] = Array.from({ length: SIMULATED_FRAMES }, (_, f) =>
    rules.map((rule, i) => toGlyph(rule.shape, trajectories[i][f])),
  );

  for (let f = 0; f < VISIBLE_FRAMES; f++) {
    if (hasOverlap(frames[f])) return null;
  }

  // The answers must not be a trivial repeat of what is already on screen.
  const givenKeys = new Set(frames.slice(0, GIVEN_FRAMES).map(frameKey));
  if (givenKeys.has(frameKey(frames[4])) || givenKeys.has(frameKey(frames[5]))) {
    return null;
  }
  if (frameKey(frames[4]) === frameKey(frames[5])) return null;

  const imageOne = buildOptions(rng, rules, trajectories, frames, 4);
  if (!imageOne) return null;
  const imageTwo = buildOptions(rng, rules, trajectories, frames, 5);
  if (!imageTwo) return null;

  return {
    seed,
    taskType: "figure_sequences",
    difficulty,
    given: frames.slice(0, GIVEN_FRAMES),
    options: [imageOne.options, imageTwo.options],
    answer: [imageOne.answerIndex, imageTwo.answerIndex],
    explanation: rules.map(describeRule),
  };
}

/* ------------------------------------------------------------------ *
 * Response options
 * ------------------------------------------------------------------ */

/**
 * Where each figure sits, ignoring colour and orientation. Two options that
 * share a position signature look like the same picture at a glance, however
 * their data differs.
 */
export function positionKey(frame: Frame): string {
  return frame
    .map((g) => `${g.shape}@${g.row},${g.col}`)
    .sort()
    .join("|");
}

function buildOptions(
  rng: Rng,
  rules: SymbolRule[],
  trajectories: GlyphState[][],
  frames: Frame[],
  frameIndex: number,
): { options: Frame[]; answerIndex: number } | null {
  const truth = frames[frameIndex];
  const truthKey = frameKey(truth);

  const distractors: Frame[] = [];
  const seen = new Set<string>([truthKey]);
  const seenPositions = new Set<string>([positionKey(truth)]);

  for (let tries = 0; tries < 600 && distractors.length < OPTIONS_PER_IMAGE - 1; tries++) {
    const candidate = perturb(rng, rules, trajectories, truth, frameIndex);
    if (!candidate) continue;
    if (hasOverlap(candidate)) continue;

    const key = frameKey(candidate);
    const positions = positionKey(candidate);
    // Every option has to be tellable apart at a glance. Requiring distinct
    // position signatures rules out sets where two options differ only by one
    // figure's colour, which read as duplicates on screen.
    if (seen.has(key) || seenPositions.has(positions)) continue;

    seen.add(key);
    seenPositions.add(positions);
    distractors.push(candidate);
  }

  if (distractors.length < OPTIONS_PER_IMAGE - 1) return null;

  const options = rng.shuffle([truth, ...distractors]);
  const answerIndex = options.findIndex((frame) => frameKey(frame) === truthKey);
  if (answerIndex < 0) return null;
  return { options, answerIndex };
}

/**
 * Moves one figure off the correct cell, either to somewhere else on its own
 * path (the classic "off by a step" mistake) or by exchanging places with
 * another figure. Returns false if neither is possible.
 */
function movePosition(
  rng: Rng,
  frame: Frame,
  trajectories: GlyphState[][],
  target: number,
  frameIndex: number,
  count: number,
): boolean {
  for (const strategy of rng.shuffle(["offset", "swap"] as const)) {
    if (strategy === "offset") {
      for (const delta of rng.shuffle([-3, -2, -1, 1, 2, 3])) {
        const source = trajectories[target][frameIndex + delta];
        if (!source) continue;
        if (source.row === frame[target].row && source.col === frame[target].col) {
          continue;
        }
        frame[target].row = source.row;
        frame[target].col = source.col;
        return true;
      }
    } else if (count >= 2) {
      const other = (target + rng.int(1, count - 1)) % count;
      if (
        frame[other].row === frame[target].row &&
        frame[other].col === frame[target].col
      ) {
        continue;
      }
      const row = frame[target].row;
      const col = frame[target].col;
      frame[target].row = frame[other].row;
      frame[target].col = frame[other].col;
      frame[other].row = row;
      frame[other].col = col;
      return true;
    }
  }
  return false;
}

/**
 * Produces a near-miss. Every distractor moves at least one figure, so it can
 * never be confused with another option; a wrong colour or orientation may
 * ride along on top, but never on its own.
 */
function perturb(
  rng: Rng,
  rules: SymbolRule[],
  trajectories: GlyphState[][],
  truth: Frame,
  frameIndex: number,
): Frame | null {
  const next = truth.map((glyph) => ({ ...glyph }));
  const target = rng.int(0, rules.length - 1);

  if (!movePosition(rng, next, trajectories, target, frameIndex, rules.length)) {
    return null;
  }

  const rule = rules[target];
  if (rule.colour.kind === "cycle" && rng.bool(0.35)) {
    const alternatives = rule.colour.palette.filter(
      (colour: ColourId) => colour !== next[target].colour,
    );
    if (alternatives.length > 0) next[target].colour = rng.pick(alternatives);
  } else if (rule.rotation.kind !== "none" && rng.bool(0.35)) {
    next[target].rotation = (next[target].rotation + rng.pick([90, 180, 270])) % 360;
  }

  return next;
}

/* ------------------------------------------------------------------ *
 * Explanations
 * ------------------------------------------------------------------ */

const ORDINALS = ["first", "second", "third", "fourth", "fifth"];

function fields(n: number): string {
  return n === 1 ? "one field" : `${n} fields`;
}

function describeRule(rule: SymbolRule): string {
  const parts: string[] = [];
  const subject = `The ${rule.shape} symbol`;

  switch (rule.motion.kind) {
    case "line": {
      const orientation = rule.motion.axis === "row" ? "horizontally" : "vertically";
      const lane =
        rule.motion.axis === "row"
          ? `the ${ORDINALS[rule.motion.fixed]} row`
          : `the ${ORDINALS[rule.motion.fixed]} column`;
      const border =
        rule.motion.axis === "row" ? "right or left border" : "upper or lower border";
      const amount = rule.motion.growth
        ? "by x + 1 fields (one field from matrix 1 to matrix 2, two fields from matrix 2 to matrix 3, and so on)"
        : `by ${fields(rule.motion.step)}`;
      parts.push(
        `${subject} moves ${orientation} ${amount} in ${lane} and bounces off the ${border}.`,
      );
      break;
    }
    case "diagonal": {
      const vertical = rule.motion.dRow === -1 ? "upwards" : "downwards";
      const horizontal = rule.motion.dCol === 1 ? "to the right" : "to the left";
      parts.push(
        `${subject} moves diagonally ${vertical} ${horizontal} from its starting position until it bounces off a boundary and returns the same way.`,
      );
      break;
    }
    case "perimeter": {
      const sense = rule.motion.direction === 1 ? "clockwise" : "counter clockwise";
      const amount = rule.motion.growth
        ? "by x + 1 fields (one field from matrix 1 to matrix 2, two fields from matrix 2 to matrix 3, and so on)"
        : `by ${fields(rule.motion.step)} at a time`;
      parts.push(`${subject} moves along the outer borders ${sense} ${amount}.`);
      break;
    }
    case "cycle": {
      parts.push(
        `${subject} moves one field at a time from image to image. The order of the directions is: ${rule.motion.directionNames.join(
          ", ",
        )}, and so on.`,
      );
      break;
    }
  }

  if (rule.rotation.kind === "fixed") {
    const sense = rule.rotation.delta === 90 ? "right" : "left";
    parts.push(`It rotates 90 degrees to the ${sense} from image to image.`);
  } else if (rule.rotation.kind === "growth") {
    const sense = rule.rotation.direction === 1 ? "right" : "left";
    parts.push(
      `It always turns x + 1 times by 90 degrees to the ${sense} (once from matrix 1 to matrix 2, twice from matrix 2 to matrix 3, and so on).`,
    );
  }

  if (rule.colour.kind === "cycle") {
    const names = rule.colour.palette.map((c) => COLOUR_LABELS[c]);
    parts.push(
      names.length === 2
        ? `It changes its colour alternately from ${names[0]} to ${names[1]}.`
        : `It changes its colour from ${names.join(" to ")}, and so on.`,
    );
  }

  return parts.join(" ");
}

/** Convenience for tests and tooling. */
export function figureSeed(difficulty: Difficulty, payload: string): string {
  return formatSeed("figure_sequences", difficulty, payload);
}
