# Kenney Tiny Dungeon — Tile Notes

Source: `public/ui/kenney_tiny-dungeon/Tilemap/tilemap_packed.png`  
Sheet layout: **12 columns × 11 rows**, 16 × 16 px per tile, no spacing.  
Tile number N → `col = N % 12`, `row = Math.floor(N / 12)`.  
License: CC0

---

## Floor tiles (open walkable cells)

All weights are relative to tile 0048 = 1.

| Tile # | (col, row) | Weight ratio | Description |
|--------|-----------|--------------|-------------|
| 0048   | (0, 4)    | 1            | Plain orange dirt — base reference |
| 0049   | (1, 4)    | 1/4          | Orange dirt variant |
| 0042   | (6, 3)    | 1/50         | Orange dirt with distinct feature (rare) |

Integer weights used in code: **100 : 25 : 2**

---

## Large obstacle tiles (≥ 3 connected blocked tiles)

Used when a blocked tile has ≥ 2 orthogonally-blocked neighbours (i.e. it is interior to a wall segment).

| Tile # | (col, row) | Weight ratio | Description |
|--------|-----------|--------------|-------------|
| 0040   | (4, 3)    | 1            | Stone brick wall — base reference |
| 0028   | (4, 2)    | 1/10         | Darker/ornate brick variant |
| 0029   | (5, 2)    | 1/100        | Most ornate brick (very rare) |

Integer weights: **100 : 10 : 1**

---

## Small filler tiles (isolated or 2-tile obstacles)

Used when a blocked tile has 0–1 orthogonally-blocked neighbours.  
Rendered on top of tile 0048 (the base floor), so they must be transparent-background props.  
All fillers have equal weight.

| Tile # | (col, row) | Description |
|--------|-----------|-------------|
| 0054   | (6, 4)    | Barrel / cask |
| 0055   | (7, 4)    | Chest |
| 0063   | (3, 5)    | Wooden crate |
| 0064   | (4, 5)    | Barrel (alt) |
| 0065   | (5, 5)    | Small chest |
| 0072   | (0, 6)    | Barrel (large) |
| 0074   | (2, 6)    | Barrel with hoops |
| 0082   | (10, 6)   | Decorative marker |
| 0089   | (5, 7)    | Small figure / idol |

---

## Classification rule

At render time, count a tile's orthogonally-blocked neighbours:

- **0 or 1 neighbours** → small filler (prop over floor base)
- **2+ neighbours** → large obstacle (full wall tile)

This correctly identifies scatter tiles (always 0 neighbours) and wall-segment interiors (always ≥ 2).  
Note: end caps of 3-tile wall segments have 1 neighbour → classified as "small", giving them a decorative prop — intentional, looks like a wall cap.
