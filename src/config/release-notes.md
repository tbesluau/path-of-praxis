### 0.1.26 — Community feedback

A round of improvements driven by player feedback since the beta.

- **Clearer skill assignment** — added the missing tooltips and inline information when assigning actions and skills, so it's easier to understand what each slot does before you commit to it.
- **Import / Export** — save your character to a portable code and load it back on any device, so progress is no longer locked to a single browser.
- **Manual death confirmation** — a confirmation step before manually dying or rebirthing prevents accidental resets. It can be turned off in Settings, above the Full-screen toggle.
- **More languages** — additional locales added on top of English and French: Spanish, Chinese, and Russian.
- **Sound effects** — combat actions (fire, lightning, physical), enemy and boss deaths, the player dash, and UI interactions (buttons, toggles, opening and closing modals) now have audio. Volume and mute are configurable in Settings.
- **New terrain** — hand-drawn medieval-forest tiles replace the old map art: grassy ground with pebbles and wildflowers, wooded thickets rendered as tree canopies, and scattered decorations such as rocks, ponds, brambles, and broken carriages.

### 0.1.0 — Beta release

The first public beta. Everything below was built from zero during the alpha.

### Combat

- Auto-battler combat with projectile, area, and strike action types, each with their own range, area, and speed profiles.
- Action triggers configurable across up to three slots: auto-attack, periodic, critical-hit, and affliction-on-stack triggers, unlocked by Ascending.
- Targeting modes: nearest, weakest, strongest, random.
- Critical hits with action-type-specific base chances.

### Progression

- Action XP levels up individual actions for damage and speed bonuses.
- Life and Mana XP from taking damage and spending mana grow your character stats.
- Mastery trees (Fire, Physical, Lightning, Life, Mana, Movement, and more) with key nodes, major nodes, and a point-dump mode for cheap filler.
- Rebirth: keep mastery progress across runs.
- Ascension: hit enemy max-level milestones to unlock damage, XP, and speed bonuses plus additional trigger slots and universe-point investments.

### Enemies

- Normal, Strong, Elite, Champion, and Boss tiers with escalating stats, resistances, sizes, and XP rewards.
- Per-enemy stat variance and difficulty scaling tied to the enemy max-level you push.
- Wave system with directional clustering and depth variance.

### Afflictions

- Burn, Bleed, and Electrocution stack and tick over time.
- Enemies apply afflictions back at the player at a reduced rate.
- Key nodes for damage-over-time builds, including "deal no hit damage but full affliction damage" trade-offs and life-steal-from-afflictions.

### Quality of life

- DPS meter with stable action ordering.
- ×2 speed stockpile from idle time, with a welcome-back modal that consolidates while you're away.
- Damage numbers, configurable zoom, full-screen toggle.
- English and French localization.
- Guide and contextual note links throughout descriptions.

### Visuals

- Kenney RPG UI for panels, buttons, and frames.
- Kenney Tiny Dungeon for procedural map tiles, obstacles, and scatter.
