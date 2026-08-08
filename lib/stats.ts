import type { AttemptRow } from "./attempts";
import { median } from "./format";
import {
  DIFFICULTIES,
  TASK_TYPES,
  type Difficulty,
  type TaskType,
} from "./generators/types";

export interface Bucket {
  total: number;
  correct: number;
  medianMs: number;
  /** Distinct seeds, so repeated replays of one seed only count once. */
  unique: number;
}

export interface TypeStats extends Bucket {
  taskType: TaskType;
  byDifficulty: Record<Difficulty, Bucket>;
}

export interface DayPoint {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  total: number;
  correct: number;
  byType: Record<TaskType, number>;
}

export interface Summary {
  overall: Bucket;
  byType: TypeStats[];
  daily: DayPoint[];
}

function emptyBucket(): Bucket {
  return { total: 0, correct: 0, medianMs: 0, unique: 0 };
}

function summariseRows(rows: AttemptRow[]): Bucket {
  const durations = rows.map((r) => r.duration_ms);
  return {
    total: rows.length,
    correct: rows.filter((r) => r.is_correct).length,
    medianMs: median(durations),
    unique: new Set(rows.filter((r) => !r.is_replay).map((r) => r.seed)).size,
  };
}

/** Local YYYY-MM-DD, so "today" matches the user's calendar, not UTC. */
function localDay(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function summarise(rows: AttemptRow[], days = 30): Summary {
  const byType = TASK_TYPES.map((taskType) => {
    const forType = rows.filter((r) => r.task_type === taskType);
    const byDifficulty = Object.fromEntries(
      DIFFICULTIES.map((difficulty) => [
        difficulty,
        summariseRows(forType.filter((r) => r.difficulty === difficulty)),
      ]),
    ) as Record<Difficulty, Bucket>;

    return { taskType, ...summariseRows(forType), byDifficulty };
  });

  // A dense series, so quiet days show as gaps rather than being skipped.
  const emptyByType = () =>
    Object.fromEntries(TASK_TYPES.map((t) => [t, 0])) as Record<TaskType, number>;

  const counts = new Map<string, Omit<DayPoint, "date">>();
  for (const row of rows) {
    const day = localDay(row.created_at);
    const entry = counts.get(day) ?? { total: 0, correct: 0, byType: emptyByType() };
    entry.total++;
    if (row.is_correct) entry.correct++;
    entry.byType[row.task_type] = (entry.byType[row.task_type] ?? 0) + 1;
    counts.set(day, entry);
  }

  const daily: DayPoint[] = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const key = `${date.getFullYear()}-${month}-${day}`;
    const entry = counts.get(key) ?? {
      total: 0,
      correct: 0,
      byType: emptyByType(),
    };
    daily.push({ date: key, ...entry });
  }

  return { overall: summariseRows(rows), byType, daily };
}

export function emptySummary(): Summary {
  return {
    overall: emptyBucket(),
    byType: TASK_TYPES.map((taskType) => ({
      taskType,
      ...emptyBucket(),
      byDifficulty: Object.fromEntries(
        DIFFICULTIES.map((d) => [d, emptyBucket()]),
      ) as Record<Difficulty, Bucket>,
    })),
    daily: [],
  };
}
