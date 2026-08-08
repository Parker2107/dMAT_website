"""Rasterizes a real generated Figure Sequences question, for visual checking
against the official artwork.

Reads a question as JSON on stdin (see `npm run preview -- json figures high`)
and reproduces exactly what MatrixSvg draws: the same 4x4 grid geometry, the
same figure paths read out of GlyphSvg.tsx, the same 0.72 glyph scale.

    npx vite-node scripts/preview.ts json figures high | python scripts/render_question.py

Writes scripts/out/question.png (gitignored).
"""

import json
import sys
from pathlib import Path

from render_glyphs import (  # reuse the path parser and rasterizer
    downsample,
    fill_polygons,
    parse_path,
    read_paths,
    rotate,
    write_png,
)

OUT = Path(__file__).resolve().parent / "out"

# Must mirror components/render/MatrixSvg.tsx.
MATRIX_SIZE = 4
PADDING = 4.0
GLYPH_SCALE = 0.72

BOX = 120  # rendered size of one matrix, in output pixels
SS = 3
MARGIN = 12
LABEL_BAND = 14

COLOURS = {
    "black": (0x1C, 0x19, 0x17),
    "white": (0xFF, 0xFF, 0xFF),
    "pink": (0xEC, 0x48, 0x99),
    "yellow": (0xFA, 0xCC, 0x15),
    "orange": (0xF9, 0x73, 0x16),
    "green": (0x16, 0xA3, 0x4A),
    "blue": (0x25, 0x63, 0xEB),
}
PAGE = (0xF4, 0xF4, 0xF5)
CELL_BG = (0xFF, 0xFF, 0xFF)
PLACEHOLDER_BG = (0xE4, 0xE4, 0xE7)
INK = (0x18, 0x18, 0x1B)


def render_matrix(frame, paths, placeholder=False):
    """One matrix at supersampled resolution, returned downsampled."""
    size = BOX * SS
    background = PLACEHOLDER_BG if placeholder else CELL_BG
    buffer = bytearray(bytes(background) * (size * size))
    unit = size / 100.0

    inner = 100 - PADDING * 2
    cell = inner / MATRIX_SIZE

    def rect(x0, y0, x1, y1, colour):
        x0, y0 = max(0, int(x0)), max(0, int(y0))
        x1, y1 = min(size, int(x1)), min(size, int(y1))
        row = bytes(colour) * max(0, x1 - x0)
        for y in range(y0, y1):
            o = (y * size + x0) * 3
            buffer[o : o + len(row)] = row

    # Page colour in the padding band, so the matrix border is visible.
    rect(0, 0, size, PADDING * unit, PAGE)
    rect(0, (100 - PADDING) * unit, size, size, PAGE)
    rect(0, 0, PADDING * unit, size, PAGE)
    rect((100 - PADDING) * unit, 0, size, size, PAGE)

    border = max(1, int(1.6 * unit))
    x0, y0 = PADDING * unit, PADDING * unit
    x1, y1 = (PADDING + inner) * unit, (PADDING + inner) * unit
    rect(x0, y0, x1, y0 + border, INK)
    rect(x0, y1 - border, x1, y1, INK)
    rect(x0, y0, x0 + border, y1, INK)
    rect(x1 - border, y0, x1, y1, INK)

    if placeholder:
        # A blocky "?" stand-in; the app draws a real glyph.
        cx, cy = size / 2, size / 2
        w = size * 0.05
        rect(cx - w * 2, cy - w * 3, cx + w * 2, cy - w * 2, INK)
        rect(cx + w, cy - w * 3, cx + w * 2, cy, INK)
        rect(cx - w / 2, cy - w, cx + w * 2, cy, INK)
        rect(cx - w / 2, cy, cx + w / 2, cy + w * 1.5, INK)
        rect(cx - w / 2, cy + w * 2.5, cx + w / 2, cy + w * 3.5, INK)
        return downsample(buffer, size, SS)

    line = max(1, int(0.9 * unit))
    for i in range(1, MATRIX_SIZE):
        at = (PADDING + cell * i) * unit
        rect(at, y0, at + line, y1, INK)
        rect(x0, at, x1, at + line, INK)

    for glyph in frame:
        scale = (cell * GLYPH_SCALE) / 100.0
        offset = (cell - 100 * scale) / 2
        gx = (PADDING + glyph["col"] * cell + offset) * unit
        gy = (PADDING + glyph["row"] * cell + offset) * unit
        polygons = [rotate(sub, glyph["rotation"]) for sub in parse_path(paths[glyph["shape"]])]
        placed = [
            [(gx + px * scale * unit, gy + py * scale * unit) for px, py in sub]
            for sub in polygons
        ]
        for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2), (-2, -2), (2, 2), (-2, 2), (2, -2)):
            fill_polygons(
                buffer, size, [[(px + dx, py + dy) for px, py in s] for s in placed], INK
            )
        fill_polygons(buffer, size, placed, COLOURS[glyph["colour"]])

    return downsample(buffer, size, SS)


def paste(sheet, sheet_w, tile, tile_size, x, y):
    for row in range(tile_size):
        src = row * tile_size * 3
        dst = ((y + row) * sheet_w + x) * 3
        sheet[dst : dst + tile_size * 3] = tile[src : src + tile_size * 3]


def main() -> None:
    question = json.load(sys.stdin)
    paths = read_paths()
    OUT.mkdir(exist_ok=True)

    columns = 6
    rows = 1 + 3
    width = MARGIN + columns * (BOX + MARGIN)
    height = MARGIN + rows * (BOX + MARGIN + LABEL_BAND)
    sheet = bytearray(bytes(PAGE) * (width * height))

    # Row 1: matrices 1-4 then the two hidden matrices.
    for index, frame in enumerate(question["given"]):
        tile, size = render_matrix(frame, paths)
        paste(sheet, width, tile, size, MARGIN + index * (BOX + MARGIN), MARGIN)
    for offset in range(2):
        tile, size = render_matrix([], paths, placeholder=True)
        paste(sheet, width, tile, size, MARGIN + (4 + offset) * (BOX + MARGIN), MARGIN)

    # Rows 2-4: the three response options for each image.
    for image in range(2):
        for option_index, option in enumerate(question["options"][image]):
            tile, size = render_matrix(option, paths)
            x = MARGIN + (image * 3) * (BOX + MARGIN)
            y = MARGIN + (option_index + 1) * (BOX + MARGIN + LABEL_BAND)
            paste(sheet, width, tile, size, x, y)

    write_png(OUT / "question.png", width, height, sheet)
    print(f"seed {question['seed']} · difficulty {question['difficulty']}")
    print(f"correct: Image 1 = Matrix {question['answer'][0] + 1}, "
          f"Image 2 = Matrix {question['answer'][1] + 1}")
    for line in question["explanation"]:
        print(f"  - {line}")
    print("wrote scripts/out/question.png")


if __name__ == "__main__":
    main()
