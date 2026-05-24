#!/usr/bin/env python3
"""
Alpha-bleed: propagate RGB from opaque pixels into fully transparent
neighbours.

Why this matters: the Kenney UI assets (and the composed bar sprites
derived from them) ship with fully-transparent corner/anti-alias pixels
whose RGB channels are (0, 0, 0). When the browser draws these PNGs as
border-image at sub-pixel positions — which happens whenever a flex- or
percentage-sized element ends up at a fractional CSS pixel — it bilinear-
filters the source. Straight-alpha bilinear filtering mixes RGB channels
of all four samples regardless of their alpha, so an opaque button-coloured
pixel sampled next to an alpha=0 RGB=(0,0,0) pixel produces a darkened
result. Composited onto the (dark) game background that fringe reads as a
faint halo / line at the edge of every button and panel.

The fix: for every alpha=0 pixel, copy the RGB of its nearest opaque
neighbour. The alpha stays 0 — pixels remain fully invisible — but the
RGB no longer poisons the bilinear filter. This is the standard
"premultiplied alpha bleed" / "edge padding" technique used in
texture-atlas tooling for games.

Idempotent: re-running on bled assets is a no-op (all alpha=0 pixels
already carry their neighbour's colour, so no further propagation).

Run after adding or replacing any UI asset:

    python3 scripts/alpha-bleed.py

The outputs overwrite the source PNGs in place; commit the changes.
"""
from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIRS = [
    ROOT / "public/ui/kenney_ui-pack-rpg-expansion/PNG",
    ROOT / "public/ui/composed_bars",
]


def alpha_bleed(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    # Multi-source BFS from every opaque pixel; the first opaque pixel
    # to reach a transparent cell wins (== nearest neighbour by Manhattan
    # distance, which is good enough — colour bleed of an extra pixel or
    # two is invisible since the destination alpha is still 0).
    src_rgb: list[list[tuple[int, int, int] | None]] = [[None] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0:
                src_rgb[y][x] = (r, g, b)
                q.append((x, y))
    while q:
        x, y = q.popleft()
        rgb = src_rgb[y][x]
        assert rgb is not None
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and src_rgb[ny][nx] is None:
                src_rgb[ny][nx] = rgb
                q.append((nx, ny))
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                rgb = src_rgb[y][x]
                if rgb is not None:
                    px[x, y] = (*rgb, 0)
    return img


def main() -> None:
    total = 0
    changed = 0
    for d in ASSET_DIRS:
        if not d.is_dir():
            continue
        for path in sorted(d.glob("*.png")):
            total += 1
            before = path.read_bytes()
            img = Image.open(path)
            bled = alpha_bleed(img)
            bled.save(path, optimize=True)
            after = path.read_bytes()
            if before != after:
                changed += 1
                print(f"  bled  {path.relative_to(ROOT)}")
    print(f"\nProcessed {total} PNG(s); {changed} updated.")


if __name__ == "__main__":
    main()
