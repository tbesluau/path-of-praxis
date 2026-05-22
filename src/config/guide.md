[//]: # (Localization note: do not localize this file for now.)
[//]: # (The guide content will change frequently as the game evolves,)
[//]: # (making translation a poor use of effort until the game is stable.)

## Actions & Action Levels

Every character performs actions during battle — either weapon attacks or spell casts. Each action has its own level that rises as you use it.

Higher action levels increase the effectiveness of that action and unlock runes that you can select to improve the action's efficiency or customize its behavior.

## Life & Mana

**Life** is your health. Reaching zero ends the run. Life recovers between battles.

**Mana** is spent to cast spells. It regenerates over time. Running low on mana limits how frequently you can cast, so balance spell use with recovery.

Both have a maximum value and regeneration rate that increases as their levels rise.

## Enemy level

The enemy level widget on top is the main game progression: the higher the level, the more experience you get. Some new features also unlock at higher enemy level.
Enemies become exponentially stronger with their level so you will need to leverage the different layers of prestige to power up enough to progress through it.

## Experience

Most aspects of the game gain experience as they are being leveraged: actions gain experience from inflicting damage, life and mana gain experience as they are being depleted, etc. As you progress in the game, you will discover many other aspects that gain experience when chosen or used.

As things gain experience, they level up and become stronger, but that's not all. Some levels unlock new abilities (like action runes), and all experience gained is counted towards Rebirth.

## Death & Rebirth

When your life reaches zero, your run ends and you Rebirth. But you don't start from scratch entirely: all experience gained during the run — actions, life, mana, etc. — is making your next run stronger. You now gain experience faster for actions, life, mana based on the highest level ever achieved, and you gain Mastery experience.

If you feel like you're stagnating and can't increase enemy level consistently, it might be time to trigger a Rebirth and cash in that experience for the large power ups of Masteries.

## Runes

Runes are per-action modifiers that unlock as an action levels up. Each action has six rune slots, each unlocking at a specific level:

- **Lv. 5** — 1st minor slot
- **Lv. 10** — 1st major slot
- **Lv. 15** — 2nd minor slot
- **Lv. 20** — 3rd minor slot
- **Lv. 25** — 2nd major slot
- **Lv. 30** — key slot

Click the action icon (next to the action XP bar) to open the runes panel.

**Minor runes** give moderate additive bonuses — damage, speed, reduced mana cost, or experience. The Sampler minor rune gives a smaller portion of all four.

**Major runes** give multiplicative "more" bonuses in the same categories, making them more powerful but less stacking. The Sampler major rune gives a smaller portion of all four.

**Key runes** radically change how the action works:
- **Split Action** — ×0.5 damage, but every action automatically fires a second action at 1/10 of the normal cycle delay.
- **Slow & Heavy** — ×2 damage but ×0.5 action speed.
- **Manaless** — ×2 mana cost, but the action fires even when you have no mana.

Each rune can only fill one slot at a time. After a Rebirth, runes auto-fill in the same order they were slotted in the previous run as slots unlock. Making a manual change in any slot disables auto-fill for the rest of that run.

## Masteries

Masteries are long-term passive upgrades that persist across Rebirths. Each mastery has its own experience track that fills through related actions and activities.

When a mastery levels up you earn a mastery point. Open a mastery's skill tree to spend points on permanent passive bonuses.

## Mastery Points & Dump

Each mastery earns points independently as you use related mechanics. Points persist across Rebirths and are never lost.

Once a mastery's trees are fully purchased, excess points can be **dumped** for a permanent bonus (1% more per point for most masteries, 0.5% for some). Use the Dump button in the mastery tree panel; Ctrl+click (or Cmd+click) dumps all available points at once.

## Increased vs More

**Increased** bonuses are additive with each other. All "+X% increased" values in the same category are summed, then applied as one multiplier: `base × (1 + total / 100)`.

**More** bonuses are each their own independent multiplier: `× (1 + X / 100)`. They stack on top of everything else.

When you already have many Increased bonuses, each additional point of Increased is worth less. A More bonus is always a full multiplier and is therefore strictly stronger at the margin.

## Action Tags

Every action carries a **damage-type tag**: Area, Projectile, or Strike. Some also carry an **element tag**: Fire, Lightning, or Physical.

The type tag controls which mastery bonuses apply and how the action behaves — area hits a radius, projectiles track a single target, strikes close to melee range. The element tag controls which afflictions the action can apply and which elemental mastery bonuses it benefits from.

## Afflictions

Afflictions are damage-over-time Effects applied to enemies by hits with a small base chance, modified by mastery nodes. Each affliction ticks independently and can stack multiple instances on the same enemy.

Current afflictions: **Burn** (fire), **Bleed** (physical), **Electrocution** (lightning debuff). Affliction ticks are not hits — they do not trigger life steal, double damage, or status procs.

## Multi-Action

Multi-actions are follow-up casts triggered by a primary action or by another multi-action. Each fires at a fraction of the normal cycle delay and may carry a damage penalty.

Every multi-action is a proper new cast: it can trigger afflictions, proc statuses, and roll for other multi-actions — but never re-trigger the same multi-action that produced it. A ×0.9 depth multiplier compounds with each generation.

## Speed Stockpile

**×2 speed** runs on a stockpile earned while you are away. For every 10 real seconds the game is not running (tab inactive, window closed, or paused), you earn 1 second of ×2 time, up to a maximum of 1 hour. Awards under 10 seconds are discarded.

When you return, a notification shows what you earned. While running at ×2 the stockpile drains in real time; at zero the game returns to ×1 and ×2 is locked until more is earned.

## DPS Meter

The DPS meter (bottom panel) tracks your average damage output over the last 10 seconds. Each action is shown independently, sorted by the order actions first fired this run.

The meter updates once per second and reflects actual damage dealt — including critical hits, affliction ticks, and multi-action hits.

## Ascent

Ascent is a one-time escalating challenge unlocked after several Rebirths. It presents a series of increasingly difficult enemy encounters. Completing an Ascent stage rewards a permanent bonus that persists through all future Rebirths — stronger than anything available through normal mastery progression.

Ascent progress is separate from your run. You can attempt it at any time from the menu; failing an Ascent stage costs nothing.
