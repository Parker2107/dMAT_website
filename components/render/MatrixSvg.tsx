import { MATRIX_SIZE, type Frame } from "@/lib/generators/types";

import { GlyphSvg } from "./GlyphSvg";

const PADDING = 4;

interface MatrixSvgProps {
  frame?: Frame;
  /** Renders the grey "?" placeholder used for matrices 5 and 6. */
  placeholder?: boolean;
  /** Rendered pixel size of the whole matrix. */
  size?: number;
  label?: string;
}

/**
 * One 4 × 4 matrix, drawn to match the official artwork: a heavy outer border,
 * thinner internal grid lines, white cells.
 */
export function MatrixSvg({
  frame,
  placeholder = false,
  size = 168,
  label,
}: MatrixSvgProps) {
  const inner = 100 - PADDING * 2;
  const cell = inner / MATRIX_SIZE;

  return (
    <figure className="flex flex-col items-center gap-1">
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-label={label ?? (placeholder ? "Unknown matrix" : "Matrix")}
        className="max-w-full shrink-0"
      >
        <rect
          x={PADDING}
          y={PADDING}
          width={inner}
          height={inner}
          fill={placeholder ? "#e4e4e7" : "#ffffff"}
          stroke="#18181b"
          strokeWidth={1.6}
        />

        {!placeholder &&
          Array.from({ length: MATRIX_SIZE - 1 }, (_, i) => (
            <g key={i} stroke="#18181b" strokeWidth={0.9}>
              <line
                x1={PADDING + cell * (i + 1)}
                y1={PADDING}
                x2={PADDING + cell * (i + 1)}
                y2={PADDING + inner}
              />
              <line
                x1={PADDING}
                y1={PADDING + cell * (i + 1)}
                x2={PADDING + inner}
                y2={PADDING + cell * (i + 1)}
              />
            </g>
          ))}

        {placeholder && (
          <text
            x={50}
            y={50}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={38}
            fontWeight={700}
            fill="#71717a"
          >
            ?
          </text>
        )}

        {!placeholder &&
          frame?.map((glyph) => (
            <GlyphSvg
              key={`${glyph.shape}-${glyph.row}-${glyph.col}`}
              shape={glyph.shape}
              colour={glyph.colour}
              rotation={glyph.rotation}
              size={cell}
              x={PADDING + glyph.col * cell}
              y={PADDING + glyph.row * cell}
            />
          ))}
      </svg>
      {label && (
        <figcaption className="text-xs text-zinc-500">{label}</figcaption>
      )}
    </figure>
  );
}
