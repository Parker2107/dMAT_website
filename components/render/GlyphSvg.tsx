import { COLOUR_HEX, type ColourId, type ShapeId } from "@/lib/generators/types";

/**
 * Shape catalogue. Every path is drawn inside a 100 × 100 box centred on
 * (50, 50) so a figure can be rotated about its own axis by rotating the group.
 *
 * The asymmetric shapes are deliberately drawn with an obvious "top", because
 * rotation is one of the rules and an ambiguous orientation makes a question
 * unanswerable.
 */
const PATHS: Record<ShapeId, string> = {
  // Asymmetric -- orientation is readable at a glance.
  arrow: "M50 10 L78 44 H62 V88 H38 V44 H22 Z",
  triangle: "M50 14 L84 82 H16 Z",
  chevron: "M50 18 L84 54 L70 68 L50 48 L30 68 L16 54 Z",
  flag: "M22 10 H34 V90 H22 Z M34 16 H84 L68 36 L84 56 H34 Z",
  ell: "M24 14 H46 V64 H84 V86 H24 Z",
  trapezoid: "M32 20 H68 L84 76 H16 Z",

  // Symmetric -- these never receive a rotation rule.
  square: "M22 22 H78 V78 H22 Z",
  circle: "M50 20 A30 30 0 1 1 49.99 20 Z",
  cross: "M40 16 H60 V40 H84 V60 H60 V84 H40 V60 H16 V40 H40 Z",
  diamond: "M50 14 L86 50 L50 86 L14 50 Z",
};

export const SHAPE_IDS = Object.keys(PATHS) as ShapeId[];

interface GlyphSvgProps {
  shape: ShapeId;
  colour: ColourId;
  rotation: number;
  /** Side length of the cell this glyph is drawn into, in SVG user units. */
  size: number;
  x: number;
  y: number;
}

/**
 * A single figure. Everything gets a dark outline so that a white figure is
 * still visible against the white matrix cell -- white is a real colour in the
 * official material ("changes its colour from white to pink to yellow").
 */
export function GlyphSvg({ shape, colour, rotation, size, x, y }: GlyphSvgProps) {
  const scale = (size * 0.72) / 100;
  const offset = (size - 100 * scale) / 2;

  return (
    <g transform={`translate(${x + offset} ${y + offset}) scale(${scale})`}>
      <g transform={`rotate(${rotation} 50 50)`}>
        <path
          d={PATHS[shape]}
          fill={COLOUR_HEX[colour]}
          stroke="#18181b"
          strokeWidth={5}
          strokeLinejoin="round"
        />
      </g>
    </g>
  );
}

/** Small inline swatch used in solution text and legends. */
export function GlyphChip({
  shape,
  colour,
  size = 22,
}: {
  shape: ShapeId;
  colour: ColourId;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="inline-block align-text-bottom"
    >
      <path
        d={PATHS[shape]}
        fill={COLOUR_HEX[colour]}
        stroke="#18181b"
        strokeWidth={6}
        strokeLinejoin="round"
      />
    </svg>
  );
}
