/**
 * Mathematical Equations generator.
 *
 * Format (from the prep material): a system of equations over letters A-D.
 * Each letter is an integer between 1 and 20, and there is always exactly one
 * solution for each letter.
 *
 * Questions are built the way the official exercises are built: pick a pivot
 * letter, define every other letter in terms of it (or of a letter already
 * defined), then add one closing equation that pins the pivot down. Compare
 * exercise 5 from the prep material, which is exactly this shape:
 *
 *     A - B + C - D = 2      <- closing equation
 *     10 - B = C             <- definitions, all in terms of B
 *     5 * B = A
 *     11 + B = D
 *
 * Uniqueness is never assumed -- every candidate system is brute-forced over
 * the full 1..20 domain and rejected unless it has exactly one solution.
 */

import { createRng, formatSeed, type Rng } from "../rng";
import {
  MAX_VALUE,
  MIN_VALUE,
  type Difficulty,
  type MathEquationsQuestion,
} from "./types";

/* ------------------------------------------------------------------ *
 * Expressions
 * ------------------------------------------------------------------ */

export type Expr =
  | { t: "num"; v: number }
  | { t: "var"; name: string }
  | { t: "add"; a: Expr; b: Expr }
  | { t: "sub"; a: Expr; b: Expr }
  | { t: "mul"; a: Expr; b: Expr }
  | { t: "div"; a: Expr; b: Expr };

export interface Equation {
  left: Expr;
  right: Expr;
}

const num = (v: number): Expr => ({ t: "num", v });
const vr = (name: string): Expr => ({ t: "var", name });
const add = (a: Expr, b: Expr): Expr => ({ t: "add", a, b });
const sub = (a: Expr, b: Expr): Expr => ({ t: "sub", a, b });
const mul = (a: Expr, b: Expr): Expr => ({ t: "mul", a, b });
const div = (a: Expr, b: Expr): Expr => ({ t: "div", a, b });
const eq = (left: Expr, right: Expr): Equation => ({ left, right });

export function evaluate(expr: Expr, env: Record<string, number>): number {
  switch (expr.t) {
    case "num":
      return expr.v;
    case "var":
      return env[expr.name];
    case "add":
      return evaluate(expr.a, env) + evaluate(expr.b, env);
    case "sub":
      return evaluate(expr.a, env) - evaluate(expr.b, env);
    case "mul":
      return evaluate(expr.a, env) * evaluate(expr.b, env);
    case "div":
      return evaluate(expr.a, env) / evaluate(expr.b, env);
  }
}

function isCompound(expr: Expr): boolean {
  return expr.t === "add" || expr.t === "sub";
}

/** Renders in the notation the prep material uses: `·` and `:` and a real minus. */
export function renderExpr(expr: Expr): string {
  const wrap = (e: Expr) => (isCompound(e) ? `(${renderExpr(e)})` : renderExpr(e));
  switch (expr.t) {
    case "num":
      return String(expr.v);
    case "var":
      return expr.name;
    case "add":
      return `${renderExpr(expr.a)} + ${renderExpr(expr.b)}`;
    case "sub":
      return `${renderExpr(expr.a)} − ${wrap(expr.b)}`;
    case "mul":
      return `${wrap(expr.a)} · ${wrap(expr.b)}`;
    case "div":
      return `${wrap(expr.a)} : ${wrap(expr.b)}`;
  }
}

export function renderEquation(equation: Equation): string {
  return `${renderExpr(equation.left)} = ${renderExpr(equation.right)}`;
}

function substitute(expr: Expr, map: Record<string, Expr>): Expr {
  switch (expr.t) {
    case "num":
      return expr;
    case "var":
      return map[expr.name] ?? expr;
    case "add":
      return add(substitute(expr.a, map), substitute(expr.b, map));
    case "sub":
      return sub(substitute(expr.a, map), substitute(expr.b, map));
    case "mul":
      return mul(substitute(expr.a, map), substitute(expr.b, map));
    case "div":
      return div(substitute(expr.a, map), substitute(expr.b, map));
  }
}

function varsOf(expr: Expr, into: Set<string> = new Set()): Set<string> {
  switch (expr.t) {
    case "num":
      break;
    case "var":
      into.add(expr.name);
      break;
    default:
      varsOf(expr.a, into);
      varsOf(expr.b, into);
  }
  return into;
}

/** Replaces every variable with its numeric value, for "A = 3 · 2 = 6" lines. */
function withValues(expr: Expr, values: Record<string, number>): Expr {
  const map: Record<string, Expr> = {};
  for (const [name, value] of Object.entries(values)) map[name] = num(value);
  return substitute(expr, map);
}

/* ------------------------------------------------------------------ *
 * Uniqueness check
 * ------------------------------------------------------------------ */

/**
 * Exhaustive search over 1..20 for every letter. Equations are checked as soon
 * as their last variable is assigned, which prunes almost all of the space.
 * Stops early once a second solution appears.
 */
export function countSolutions(
  equations: Equation[],
  variables: string[],
): { count: number; solution: Record<string, number> | null } {
  const checkAt: Equation[][] = variables.map(() => []);
  for (const equation of equations) {
    const needed = new Set([
      ...varsOf(equation.left),
      ...varsOf(equation.right),
    ]);
    let lastIndex = -1;
    for (const name of needed) {
      lastIndex = Math.max(lastIndex, variables.indexOf(name));
    }
    if (lastIndex < 0) lastIndex = 0;
    checkAt[lastIndex].push(equation);
  }

  const env: Record<string, number> = {};
  let count = 0;
  let solution: Record<string, number> | null = null;

  const recurse = (depth: number): void => {
    if (count > 1) return;
    if (depth === variables.length) {
      count++;
      if (count === 1) solution = { ...env };
      return;
    }
    const name = variables[depth];
    for (let value = MIN_VALUE; value <= MAX_VALUE; value++) {
      env[name] = value;
      let ok = true;
      for (const equation of checkAt[depth]) {
        if (evaluate(equation.left, env) !== evaluate(equation.right, env)) {
          ok = false;
          break;
        }
      }
      if (ok) recurse(depth + 1);
      if (count > 1) return;
    }
    delete env[name];
  };

  recurse(0);
  return { count, solution };
}

/* ------------------------------------------------------------------ *
 * Templates
 * ------------------------------------------------------------------ */

interface Candidate {
  equation: Equation;
  /** Target expressed in terms of the source, for the derivation. */
  solved: Expr;
}

/**
 * Constants stay in the same range the official exercises use. Every standalone
 * number across all six prep exercises is at most 18, so letting them drift up
 * to 40 produced systems that looked nothing like the real test.
 */
const MAX_CONSTANT = 20;
/** `10 · B = C` appears in the official exercise 5, so factors go up to 10. */
const MAX_FACTOR = 10;
/** Division only ever appears as `B : 2 = A`, so keep divisors small. */
const MAX_DIVISOR = 4;

/**
 * All the ways the prep material writes "target in terms of source". Both
 * orientations appear in the official exercises: `3 · C = A` puts the defined
 * letter on the right, while `B - 3 = A` puts it on the left.
 */
function definitionCandidates(
  sourceName: string,
  sourceValue: number,
  targetName: string,
  targetValue: number,
): Candidate[] {
  const S = vr(sourceName);
  const X = vr(targetName);
  const out: Candidate[] = [];

  // k · S = X
  if (targetValue % sourceValue === 0) {
    const k = targetValue / sourceValue;
    if (k >= 2 && k <= MAX_FACTOR) {
      out.push({ equation: eq(mul(num(k), S), X), solved: mul(num(k), S) });
    }
  }
  // S : k = X
  if (sourceValue % targetValue === 0) {
    const k = sourceValue / targetValue;
    if (k >= 2 && k <= MAX_DIVISOR) {
      out.push({ equation: eq(div(S, num(k)), X), solved: div(S, num(k)) });
    }
  }
  // m − S = X
  {
    const m = sourceValue + targetValue;
    if (m <= MAX_CONSTANT) {
      out.push({ equation: eq(sub(num(m), S), X), solved: sub(num(m), S) });
    }
  }
  // m + S = X
  {
    const m = targetValue - sourceValue;
    if (m >= 1) out.push({ equation: eq(add(num(m), S), X), solved: add(num(m), S) });
  }
  // S − m = X
  {
    const m = sourceValue - targetValue;
    if (m >= 1) out.push({ equation: eq(sub(S, num(m)), X), solved: sub(S, num(m)) });
  }
  // k · S ± m = X
  for (const k of [2, 3]) {
    const product = k * sourceValue;
    if (product > 40) continue;
    const minus = product - targetValue;
    if (minus >= 1 && minus <= MAX_CONSTANT) {
      out.push({
        equation: eq(sub(mul(num(k), S), num(minus)), X),
        solved: sub(mul(num(k), S), num(minus)),
      });
    }
    const plus = targetValue - product;
    if (plus >= 1 && plus <= MAX_CONSTANT) {
      out.push({
        equation: eq(add(mul(num(k), S), num(plus)), X),
        solved: add(mul(num(k), S), num(plus)),
      });
    }
  }
  // Mirrored orientations: the defined letter sits on the left.
  {
    const m = targetValue - sourceValue;
    if (m >= 1) out.push({ equation: eq(sub(X, num(m)), S), solved: add(S, num(m)) });
  }
  {
    const m = sourceValue - targetValue;
    if (m >= 1) out.push({ equation: eq(add(X, num(m)), S), solved: sub(S, num(m)) });
  }
  if (targetValue % sourceValue === 0) {
    const k = targetValue / sourceValue;
    if (k >= 2 && k <= MAX_DIVISOR) {
      out.push({ equation: eq(div(X, num(k)), S), solved: mul(num(k), S) });
    }
  }
  if (sourceValue % targetValue === 0) {
    const k = sourceValue / targetValue;
    if (k >= 2 && k <= MAX_FACTOR) {
      out.push({ equation: eq(mul(num(k), X), S), solved: div(S, num(k)) });
    }
  }
  {
    const m = sourceValue + targetValue;
    if (m <= MAX_CONSTANT) {
      out.push({ equation: eq(sub(num(m), X), S), solved: sub(num(m), S) });
    }
  }

  return out;
}

/** `p · S1 + q · S2 = X`, as in the official `2 · A + 2 · C = B`. */
function twoSourceCandidates(
  first: [string, number],
  second: [string, number],
  targetName: string,
  targetValue: number,
): Candidate[] {
  const out: Candidate[] = [];
  for (const p of [1, 2, 3]) {
    for (const q of [1, 2, 3]) {
      if (p * first[1] + q * second[1] !== targetValue) continue;
      const left = add(
        p === 1 ? vr(first[0]) : mul(num(p), vr(first[0])),
        q === 1 ? vr(second[0]) : mul(num(q), vr(second[0])),
      );
      out.push({ equation: eq(left, vr(targetName)), solved: left });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Generation
 * ------------------------------------------------------------------ */

const VAR_COUNT: Record<Difficulty, number> = { low: 2, medium: 3, high: 4 };
const ALL_VARS = ["A", "B", "C", "D"];
const MAX_ATTEMPTS = 400;

export function generateMathEquationsQuestion(
  seed: string,
  difficulty: Difficulty,
): MathEquationsQuestion {
  const varCount = VAR_COUNT[difficulty];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = createRng(seed, attempt);
    const question = tryBuild(rng, difficulty, varCount, seed);
    if (question) return question;
  }

  throw new Error(
    `Could not generate a ${difficulty} equation system for seed ${seed} in ${MAX_ATTEMPTS} attempts`,
  );
}

function tryBuild(
  rng: Rng,
  difficulty: Difficulty,
  varCount: number,
  seed: string,
): MathEquationsQuestion | null {
  const names = ALL_VARS.slice(0, varCount);

  // Distinct values keep the systems readable, as in every official exercise.
  const values: Record<string, number> = {};
  const chosen = new Set<number>();
  for (const name of names) {
    let value = 0;
    for (let i = 0; i < 40 && (value === 0 || chosen.has(value)); i++) {
      value = rng.int(MIN_VALUE, MAX_VALUE);
    }
    if (chosen.has(value)) return null;
    chosen.add(value);
    values[name] = value;
  }

  const pivot = rng.pick(names);
  const others = rng.shuffle(names.filter((n) => n !== pivot));

  const equations: Equation[] = [];
  const definitions: Array<{ target: string; equation: Equation; solved: Expr }> = [];
  const defined = [pivot];

  for (const target of others) {
    let candidates: Candidate[] = [];

    // Occasionally define a letter from two already-known letters, which is how
    // `2 · A + 2 · C = B` arises in the official medium exercise.
    //
    // Everything else is defined straight from the pivot. Allowing a letter to
    // be defined from another *derived* letter builds chains three deep, and
    // substituting those into the closing equation produces monsters like
    // `4 · A − 18 − (4 · A − 18) : 10 + ...` that the real test never contains.
    if (defined.length >= 2 && difficulty !== "low" && rng.bool(0.35)) {
      const partner = rng.pick(defined.filter((n) => n !== pivot));
      const pair: Array<[string, number]> = rng.bool()
        ? [
            [pivot, values[pivot]],
            [partner, values[partner]],
          ]
        : [
            [partner, values[partner]],
            [pivot, values[pivot]],
          ];
      candidates = twoSourceCandidates(pair[0], pair[1], target, values[target]);
    }
    if (candidates.length === 0) {
      candidates = definitionCandidates(
        pivot,
        values[pivot],
        target,
        values[target],
      );
    }

    // Belt and braces: keep only templates that actually hold for these values.
    candidates = candidates.filter(
      (c) =>
        evaluate(c.equation.left, values) === evaluate(c.equation.right, values) &&
        evaluate(c.solved, values) === values[target],
    );
    if (candidates.length === 0) return null;

    const picked = rng.pick(candidates);
    equations.push(picked.equation);
    definitions.push({ target, equation: picked.equation, solved: picked.solved });
    defined.push(target);
  }

  const closing = buildClosingEquation(rng, difficulty, pivot, names, values);
  if (!closing) return null;
  equations.push(closing);

  const { count, solution } = countSolutions(equations, names);
  if (count !== 1 || !solution) return null;
  for (const name of names) {
    if (solution[name] !== values[name]) return null;
  }

  // The official high exercises lead with the combined equation; elsewhere the
  // order is mixed.
  const ordered =
    difficulty === "high"
      ? [closing, ...equations.slice(0, -1)]
      : rng.shuffle(equations);

  return {
    seed,
    taskType: "math_equations",
    difficulty,
    equations: ordered.map(renderEquation),
    variables: names,
    solution: values,
    explanation: buildExplanation(pivot, definitions, closing, values),
  };
}

function buildClosingEquation(
  rng: Rng,
  difficulty: Difficulty,
  pivot: string,
  names: string[],
  values: Record<string, number>,
): Equation | null {
  // A direct pin, e.g. `7 + A = 14`. Only used for the easy level, where the
  // official exercise 1 does exactly this.
  if (difficulty === "low" && rng.bool(0.5)) {
    const maxK = MAX_CONSTANT - values[pivot];
    if (maxK < 1) return null;
    const k = rng.int(1, Math.min(15, maxK));
    return eq(add(num(k), vr(pivot)), num(k + values[pivot]));
  }

  const minSize = difficulty === "high" ? 3 : 2;
  const maxSize = names.length;
  const size = rng.int(minSize, maxSize);

  const rest = rng.shuffle(names.filter((n) => n !== pivot)).slice(0, size - 1);
  const members = rng.shuffle([pivot, ...rest]);

  // The leading term is always positive, matching the official exercises.
  let expr: Expr = vr(members[0]);
  let total = values[members[0]];
  for (let i = 1; i < members.length; i++) {
    const name = members[i];
    if (rng.bool()) {
      expr = add(expr, vr(name));
      total += values[name];
    } else {
      expr = sub(expr, vr(name));
      total -= values[name];
    }
  }

  // Every official right-hand side is a small positive integer.
  if (total < 1 || total > MAX_CONSTANT) return null;
  return eq(expr, num(total));
}

function buildExplanation(
  pivot: string,
  definitions: Array<{ target: string; equation: Equation; solved: Expr }>,
  closing: Equation,
  values: Record<string, number>,
): string[] {
  const lines: string[] = [];

  for (const definition of definitions) {
    lines.push(
      `From ${renderEquation(definition.equation)} it follows that ${
        definition.target
      } = ${renderExpr(definition.solved)}.`,
    );
  }

  // Push every definition into the closing equation until only the pivot is
  // left -- the same move the official solutions describe.
  const map: Record<string, Expr> = {};
  for (const definition of definitions) map[definition.target] = definition.solved;

  let left = closing.left;
  for (let i = 0; i < definitions.length + 1; i++) {
    const next = substitute(left, map);
    if (renderExpr(next) === renderExpr(left)) break;
    left = next;
  }

  const remaining = varsOf(left);
  const closingVars = varsOf(closing.left);
  const substitutionChanged = renderExpr(left) !== renderExpr(closing.left);

  if (closingVars.size === 1 && closingVars.has(pivot)) {
    // The closing equation already contains only the pivot, e.g. `7 + A = 14`.
    lines.push(
      `${renderEquation(closing)} contains only ${pivot}, which gives ${pivot} = ${
        values[pivot]
      }.`,
    );
  } else if (remaining.size === 1 && remaining.has(pivot) && substitutionChanged) {
    lines.push(
      `Substituting these into ${renderEquation(
        closing,
      )} gives ${renderExpr(left)} = ${renderExpr(closing.right)}, which solves to ${pivot} = ${
        values[pivot]
      }.`,
    );
  } else {
    lines.push(
      `Solving ${renderEquation(closing)} together with the other equations gives ${pivot} = ${
        values[pivot]
      }.`,
    );
  }

  for (const definition of definitions) {
    lines.push(
      `${definition.target} = ${renderExpr(
        withValues(definition.solved, values),
      )} = ${values[definition.target]}.`,
    );
  }

  return lines;
}

/** Convenience for tests and tooling. */
export function mathSeed(difficulty: Difficulty, payload: string): string {
  return formatSeed("math_equations", difficulty, payload);
}
