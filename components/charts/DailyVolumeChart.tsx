"use client";

import { useState } from "react";

import { TASK_LABELS } from "@/lib/generators/types";
import type { DayPoint } from "@/lib/stats";

import { CHART_INK, SERIES_COLOUR, SERIES_ORDER } from "./palette";

interface Props {
  daily: DayPoint[];
}

const PLOT_HEIGHT = 140;
const COLUMN = 12;
const GAP = 2; // surface gap between stacked segments and between columns
const BAR = COLUMN - GAP;
const RADIUS = 3; // rounded data-end, only on the top of the stack
const AXIS_WIDTH = 22;

/**
 * A rect whose top corners are rounded and whose bottom is square, so the
 * rounded data-end caps the stack and stays anchored to the baseline.
 */
function cappedBar(x: number, y: number, height: number, rounded: boolean): string {
  const r = rounded ? Math.min(RADIUS, height, BAR / 2) : 0;
  const bottom = y + height;
  if (r <= 0) return `M${x} ${y}H${x + BAR}V${bottom}H${x}Z`;
  return [
    `M${x} ${bottom}`,
    `V${y + r}`,
    `Q${x} ${y} ${x + r} ${y}`,
    `H${x + BAR - r}`,
    `Q${x + BAR} ${y} ${x + BAR} ${y + r}`,
    `V${bottom}`,
    "Z",
  ].join("");
}

/**
 * Questions answered per day for the last 30 days, stacked by task type.
 *
 * Part-to-whole over time with three distinct series -> stacked bar with the
 * categorical palette. One y-axis only.
 */
export function DailyVolumeChart({ daily }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(1, ...daily.map((d) => d.total));
  const ticks = max <= 4 ? [0, max] : [0, Math.round(max / 2), max];
  const width = AXIS_WIDTH + daily.length * COLUMN;
  const scale = (value: number) => (value / max) * PLOT_HEIGHT;
  const active = hover === null ? null : daily[hover];

  return (
    <figure className="rounded-lg border border-zinc-300 bg-white p-4">
      <figcaption className="mb-2 text-sm font-semibold text-zinc-700">
        Questions per day
        <span className="ml-2 font-normal text-zinc-500">last 30 days</span>
      </figcaption>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${PLOT_HEIGHT + 16}`}
          className="h-auto w-full"
          role="img"
          aria-label="Questions answered per day for the last 30 days, stacked by task type. The same numbers are in the table below."
        >
          {ticks.map((tick) => {
            const y = PLOT_HEIGHT - scale(tick);
            return (
              <g key={tick}>
                <line
                  x1={AXIS_WIDTH}
                  x2={width}
                  y1={y}
                  y2={y}
                  stroke={tick === 0 ? CHART_INK.baseline : CHART_INK.gridline}
                  strokeWidth={1}
                />
                <text
                  x={AXIS_WIDTH - 5}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={8}
                  fill={CHART_INK.muted}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {daily.map((day, index) => {
            const x = AXIS_WIDTH + index * COLUMN;
            const present = SERIES_ORDER.filter((t) => (day.byType[t] ?? 0) > 0);
            let cursor = PLOT_HEIGHT;

            return (
              <g
                key={day.date}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
              >
                {/* Hit target is the whole column, larger than the marks. */}
                <rect
                  x={x}
                  y={0}
                  width={COLUMN}
                  height={PLOT_HEIGHT}
                  fill={hover === index ? "rgba(11,11,11,0.05)" : "transparent"}
                />
                {present.map((taskType, position) => {
                  const height = Math.max(1.5, scale(day.byType[taskType]));
                  const top = cursor - height;
                  cursor = top - GAP;
                  return (
                    <path
                      key={taskType}
                      d={cappedBar(
                        x + GAP / 2,
                        top,
                        height,
                        position === present.length - 1,
                      )}
                      fill={SERIES_COLOUR[taskType]}
                    />
                  );
                })}
              </g>
            );
          })}

          <text
            x={AXIS_WIDTH}
            y={PLOT_HEIGHT + 12}
            fontSize={8}
            fill={CHART_INK.muted}
          >
            {daily[0]?.date.slice(5)}
          </text>
          <text
            x={width}
            y={PLOT_HEIGHT + 12}
            textAnchor="end"
            fontSize={8}
            fill={CHART_INK.muted}
          >
            {daily[daily.length - 1]?.date.slice(5)}
          </text>
        </svg>

        {active && active.total > 0 && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-max rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs shadow-sm"
            style={{
              left: `${Math.min(72, ((hover ?? 0) / daily.length) * 100)}%`,
            }}
          >
            <p className="font-semibold">{active.date}</p>
            {SERIES_ORDER.filter((t) => (active.byType[t] ?? 0) > 0).map(
              (taskType) => (
                <p key={taskType} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-sm"
                    style={{ background: SERIES_COLOUR[taskType] }}
                  />
                  {TASK_LABELS[taskType]}: {active.byType[taskType]}
                </p>
              ),
            )}
            <p className="mt-0.5 text-zinc-500">
              {active.correct}/{active.total} correct
            </p>
          </div>
        )}
      </div>

      {/* A legend is always present once there is more than one series. */}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
        {SERIES_ORDER.map((taskType) => (
          <li key={taskType} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: SERIES_COLOUR[taskType] }}
            />
            {TASK_LABELS[taskType]}
          </li>
        ))}
      </ul>
    </figure>
  );
}
