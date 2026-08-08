"""Renders the figure catalogue to a PNG contact sheet for visual checking.

The shape paths are read straight out of components/render/GlyphSvg.tsx, so
this can never drift from what the app actually draws. Each shape is rendered
at all four rotations, which is what the rotation rule demands be readable.

    python scripts/render_glyphs.py

Writes scripts/out/glyphs.png (gitignored).
"""

import math
import re
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "components" / "render" / "GlyphSvg.tsx"
OUT = Path(__file__).resolve().parent / "out"

CELL = 72
SS = 3  # supersampling factor, for readable edges
ROTATIONS = [0, 90, 180, 270]

BG = (0xFF, 0xFF, 0xFF)
GRID = (0xC3, 0xC2, 0xB7)
FILL = (0x2A, 0x78, 0xD6)
STROKE = (0x18, 0x18, 0x1B)


def read_paths() -> dict[str, str]:
    text = SOURCE.read_text(encoding="utf-8")
    block = re.search(r"const PATHS[^=]*=\s*\{(.*?)\n\};", text, re.S)
    if not block:
        raise SystemExit("could not find the PATHS object in GlyphSvg.tsx")
    return dict(re.findall(r'(\w+):\s*"([^"]+)"', block.group(1)))


def parse_path(d: str) -> list[list[tuple[float, float]]]:
    """Turns a path into polygons. Handles M/L/H/V/Z and approximates A."""
    tokens = re.findall(r"([MLHVAZmlhvaz])|(-?\d*\.?\d+)", d)
    subpaths: list[list[tuple[float, float]]] = []
    current: list[tuple[float, float]] = []
    x = y = 0.0
    command = ""
    numbers: list[float] = []

    def flush() -> None:
        nonlocal current
        if len(current) >= 3:
            subpaths.append(current)
        current = []

    index = 0
    flat = [(c, n) for c, n in tokens]
    while index < len(flat):
        command_token, number_token = flat[index]
        if command_token:
            command = command_token
            index += 1
            if command in "Zz":
                flush()
            continue

        numbers = []
        need = {"M": 2, "L": 2, "H": 1, "V": 1, "A": 7}[command.upper()]
        while len(numbers) < need and index < len(flat) and flat[index][1]:
            numbers.append(float(flat[index][1]))
            index += 1

        upper = command.upper()
        if upper == "M":
            flush()
            x, y = numbers[0], numbers[1]
            current = [(x, y)]
            command = "L" if command == "M" else "l"
        elif upper == "L":
            x, y = numbers[0], numbers[1]
            current.append((x, y))
        elif upper == "H":
            x = numbers[0]
            current.append((x, y))
        elif upper == "V":
            y = numbers[0]
            current.append((x, y))
        elif upper == "A":
            # Only the circle uses an arc: a full sweep back to the start.
            rx, ry = numbers[0], numbers[1]
            cx, cy = x, y + ry
            for step in range(64):
                angle = math.pi / 2 * 3 + (2 * math.pi * step / 64)
                current.append((cx + rx * math.cos(angle), cy + ry * math.sin(angle)))

    flush()
    return subpaths


def rotate(points, degrees, cx=50.0, cy=50.0):
    radians = math.radians(degrees)
    cos, sin = math.cos(radians), math.sin(radians)
    return [
        (
            cx + (px - cx) * cos - (py - cy) * sin,
            cy + (px - cx) * sin + (py - cy) * cos,
        )
        for px, py in points
    ]


def fill_polygons(buffer, size, polygons, colour):
    """Even-odd scanline fill; the shape subpaths are disjoint."""
    edges = []
    for polygon in polygons:
        for i in range(len(polygon)):
            x0, y0 = polygon[i]
            x1, y1 = polygon[(i + 1) % len(polygon)]
            if y0 != y1:
                edges.append((x0, y0, x1, y1))

    for py in range(size):
        yc = py + 0.5
        crossings = []
        for x0, y0, x1, y1 in edges:
            if (y0 <= yc < y1) or (y1 <= yc < y0):
                crossings.append(x0 + (yc - y0) * (x1 - x0) / (y1 - y0))
        crossings.sort()
        for i in range(0, len(crossings) - 1, 2):
            start = max(0, int(math.ceil(crossings[i] - 0.5)))
            end = min(size - 1, int(math.floor(crossings[i + 1] - 0.5)))
            for px in range(start, end + 1):
                offset = (py * size + px) * 3
                buffer[offset : offset + 3] = bytes(colour)


def downsample(buffer, size, factor):
    out_size = size // factor
    out = bytearray(out_size * out_size * 3)
    for y in range(out_size):
        for x in range(out_size):
            r = g = b = 0
            for dy in range(factor):
                for dx in range(factor):
                    o = ((y * factor + dy) * size + (x * factor + dx)) * 3
                    r += buffer[o]
                    g += buffer[o + 1]
                    b += buffer[o + 2]
            n = factor * factor
            o = (y * out_size + x) * 3
            out[o] = r // n
            out[o + 1] = g // n
            out[o + 2] = b // n
    return out, out_size


def render_glyph(d: str, degrees: int) -> tuple[bytearray, int]:
    size = CELL * SS
    buffer = bytearray(bytes(BG) * (size * size))
    scale = size / 100.0

    polygons = [rotate(sub, degrees) for sub in parse_path(d)]
    scaled = [[(px * scale, py * scale) for px, py in sub] for sub in polygons]

    # Outline first (a dilated copy), then the fill on top -- a cheap stand-in
    # for the SVG stroke, enough to check that white figures stay visible.
    for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2), (-2, -2), (2, 2), (-2, 2), (2, -2)):
        fill_polygons(
            buffer,
            size,
            [[(px + dx, py + dy) for px, py in sub] for sub in scaled],
            STROKE,
        )
    fill_polygons(buffer, size, scaled, FILL)
    return downsample(buffer, size, SS)


def write_png(path: Path, width: int, height: int, pixels: bytearray) -> None:
    raw = bytearray()
    stride = width * 3
    for y in range(height):
        raw.append(0)
        raw.extend(pixels[y * stride : (y + 1) * stride])

    def chunk(tag: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + tag
            + payload
            + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
        )

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def main() -> None:
    paths = read_paths()
    OUT.mkdir(exist_ok=True)

    names = list(paths)
    width = CELL * len(ROTATIONS)
    height = CELL * len(names)
    sheet = bytearray(bytes(BG) * (width * height))

    for row, name in enumerate(names):
        for col, degrees in enumerate(ROTATIONS):
            glyph, glyph_size = render_glyph(paths[name], degrees)
            for y in range(glyph_size):
                src = y * glyph_size * 3
                dst = ((row * CELL + y) * width + col * CELL) * 3
                sheet[dst : dst + glyph_size * 3] = glyph[src : src + glyph_size * 3]

    # Cell separators, so each figure's box is obvious.
    for row in range(len(names) + 1):
        y = min(height - 1, row * CELL)
        for x in range(width):
            o = (y * width + x) * 3
            sheet[o : o + 3] = bytes(GRID)
    for col in range(len(ROTATIONS) + 1):
        x = min(width - 1, col * CELL)
        for y in range(height):
            o = (y * width + x) * 3
            sheet[o : o + 3] = bytes(GRID)

    write_png(OUT / "glyphs.png", width, height, sheet)
    print(f"wrote scripts/out/glyphs.png — rows: {', '.join(names)}")
    print(f"columns: {', '.join(f'{d}deg' for d in ROTATIONS)}")


if __name__ == "__main__":
    main()
