#!/usr/bin/env python3
"""
Compose Kenney UI Pack RPG three-piece bar sprites into single composite PNGs.

For each bar colour, horizontally concatenates Left (9px) + Mid (18px) +
Right (9px) into a single 36x18 PNG. The composites are then consumed by
CSS `border-image` rules in src/styles/main.css with slice `0 9 fill stretch`,
which is the same idiom this project already uses for panels and buttons.

Run once when the source sprites change; the outputs are checked into the
repo so the build doesn't depend on Python or PIL.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/ui/kenney_ui-pack-rpg-expansion/PNG"
OUT = ROOT / "public/ui/composed_bars"

# Kenney named the blue mid file "barBlue_horizontalBlue.png" rather than
# "barBlue_horizontalMid.png". The mapping below is explicit so the quirk
# is documented in one place.
COLOURS = {
    "barBack":   "barBack_horizontalMid.png",
    "barYellow": "barYellow_horizontalMid.png",
    "barRed":    "barRed_horizontalMid.png",
    "barGreen":  "barGreen_horizontalMid.png",
    "barBlue":   "barBlue_horizontalBlue.png",
}


def compose(prefix: str, mid_filename: str) -> None:
    left = Image.open(SRC / f"{prefix}_horizontalLeft.png").convert("RGBA")
    mid = Image.open(SRC / mid_filename).convert("RGBA")
    right = Image.open(SRC / f"{prefix}_horizontalRight.png").convert("RGBA")

    assert left.size == (9, 18), f"{prefix} left: {left.size}"
    assert mid.size == (18, 18), f"{prefix} mid: {mid.size}"
    assert right.size == (9, 18), f"{prefix} right: {right.size}"

    out = Image.new("RGBA", (36, 18), (0, 0, 0, 0))
    out.paste(left, (0, 0))
    out.paste(mid, (9, 0))
    out.paste(right, (27, 0))

    out_path = OUT / f"{prefix}_horizontal.png"
    out.save(out_path, "PNG", optimize=True)
    print(f"wrote {out_path.relative_to(ROOT)} ({out.size[0]}x{out.size[1]})")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for prefix, mid in COLOURS.items():
        compose(prefix, mid)


if __name__ == "__main__":
    main()
