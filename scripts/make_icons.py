"""Generates the PWA PNG icons.

Pure standard library -- no Pillow -- so the icons can be regenerated anywhere:

    python scripts/make_icons.py

The motif is the Figure Sequences matrix: a 4x4 grid with one blue figure,
which is the example the official preparatory materials open with.
"""

import struct
import zlib
from pathlib import Path

BACKGROUND = (0x18, 0x18, 0x1B)
CELL = (0xFF, 0xFF, 0xFF)
FIGURE = (0x2A, 0x78, 0xD6)

PUBLIC = Path(__file__).resolve().parent.parent / "public"


def render(size: int, safe_ratio: float) -> bytearray:
    """Draws the icon into a flat RGB buffer.

    `safe_ratio` is the fraction of the canvas the grid occupies. Maskable
    icons are cropped to a circle, so their grid is drawn smaller to stay
    inside the safe zone.
    """
    pixels = bytearray(BACKGROUND * (size * size))

    grid = int(size * safe_ratio)
    grid -= grid % 4  # keep the four cells whole
    origin = (size - grid) // 2
    cell = grid // 4
    line = max(1, round(size * 0.016))
    border = max(2, round(size * 0.027))

    def fill(x0: int, y0: int, x1: int, y1: int, colour: tuple[int, int, int]) -> None:
        x0, y0 = max(0, x0), max(0, y0)
        x1, y1 = min(size, x1), min(size, y1)
        row = bytes(colour) * max(0, x1 - x0)
        for y in range(y0, y1):
            start = (y * size + x0) * 3
            pixels[start : start + len(row)] = row

    # White grid area, then one blue figure in row 1, column 2 (0-indexed).
    fill(origin, origin, origin + grid, origin + grid, CELL)
    inset = max(1, cell // 10)
    fill(
        origin + cell + inset,
        origin + cell + inset,
        origin + 2 * cell - inset,
        origin + 2 * cell - inset,
        FIGURE,
    )

    # Internal grid lines.
    for i in range(1, 4):
        at = origin + i * cell
        fill(at - line // 2, origin, at + line - line // 2, origin + grid, BACKGROUND)
        fill(origin, at - line // 2, origin + grid, at + line - line // 2, BACKGROUND)

    # Outer border.
    fill(origin, origin, origin + grid, origin + border, BACKGROUND)
    fill(origin, origin + grid - border, origin + grid, origin + grid, BACKGROUND)
    fill(origin, origin, origin + border, origin + grid, BACKGROUND)
    fill(origin + grid - border, origin, origin + grid, origin + grid, BACKGROUND)

    return pixels


def write_png(path: Path, size: int, pixels: bytearray) -> None:
    raw = bytearray()
    stride = size * 3
    for y in range(size):
        raw.append(0)  # filter type 0 (None)
        raw.extend(pixels[y * stride : (y + 1) * stride])

    def chunk(tag: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + tag
            + payload
            + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
        )

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def main() -> None:
    targets = [
        ("icon-192.png", 192, 0.63),
        ("icon-512.png", 512, 0.63),
        ("icon-maskable-512.png", 512, 0.50),
        ("apple-touch-icon.png", 180, 0.63),
    ]
    for name, size, ratio in targets:
        write_png(PUBLIC / name, size, render(size, ratio))
        print(f"wrote public/{name} ({size}x{size})")


if __name__ == "__main__":
    main()
