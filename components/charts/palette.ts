import { TASK_TYPES, type TaskType } from "@/lib/generators/types";

/**
 * Categorical slots 1-3 of the reference data-viz palette, in fixed order.
 * Validated for this app's white chart surface:
 *
 *   node scripts/validate_palette.js "#2a78d6,#eb6834,#1baf7a" \
 *     --mode light --surface "#ffffff" --pairs all
 *   → lightness band PASS · chroma floor PASS
 *   → CVD separation PASS (worst all-pairs ΔE 9.2, deutan)
 *   → normal-vision floor PASS (worst all-pairs ΔE 24.0)
 *   → contrast WARN: aqua #1baf7a is 2.82:1 on white
 *
 * The contrast WARN obliges "relief": the dashboard therefore always ships the
 * same numbers as a table alongside the chart, and the legend is always present.
 *
 * Colour follows the task type, never its rank, so filtering or reordering the
 * dashboard never repaints a series.
 *
 * The app is deliberately light-only -- white is a real figure colour in the
 * Figure Sequences format, so a dark surface would change what the questions
 * look like. There is therefore no dark step here by design.
 */
export const SERIES_COLOUR: Record<TaskType, string> = {
  figure_sequences: "#2a78d6", // slot 1, blue
  math_equations: "#eb6834", // slot 2, orange
  latin_squares: "#1baf7a", // slot 3, aqua
};

export const CHART_INK = {
  surface: "#ffffff",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",
  muted: "#898781",
  secondary: "#52514e",
  primary: "#0b0b0b",
} as const;

export const SERIES_ORDER = TASK_TYPES;
