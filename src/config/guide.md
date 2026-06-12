## Actions, Action Levels, and Runes

This is the main source of damage in the game. You character and your enemies perform actions during battle to damage each other. As you keep using a given action, it gains experience based on the damage it dealt and levels up. A higher level action deals additional damage at a slightly higher pace. The highest level ever reached by an action also increases the rate of action experience you get by 10% additively per level. Leveling actions also unlocks rune slots where you can assign runes for action bonuses. Each action has six rune slots, each unlocking at a specific level:

- **Lv. 5** — 1st minor slot
- **Lv. 10** — 1st major slot
- **Lv. 15** — 2nd minor slot
- **Lv. 22** — 3rd minor slot
- **Lv. 30** — 2nd major slot
- **Lv. 40** — key slot

## Enemy level

The enemy level widget on top is the main game progression: the higher the level, the more experience you get. You can chose the enemy level you want by hand or let it level up automatically (it will rise 1 level per wave until maxed). Please note you can only gain experience towards the next enemy level when playing at the current maximum level. Some new features also unlock at higher enemy level.
Enemies become exponentially stronger with their level so you will need to leverage the different layers of prestige to power up enough to progress through it.

## Death & Rebirth

When your life reaches zero, your run ends and you Rebirth. But you don't start from scratch entirely: all experience gained during the run — actions, life, mana, etc. — is making your next run stronger. You now gain experience faster for actions, life, mana based on the highest level ever achieved, and you gain Mastery experience.

If you feel like you're stagnating and can't increase enemy level consistently, it might be time to trigger a Rebirth and cash in that experience for the large power ups of Masteries.

## Masteries

Masteries are long-term passive upgrades that persist across Rebirths. Each mastery has its own experience track that fills through related actions and activities.

When a mastery levels up you earn a mastery point. Open a mastery's skill tree to spend points on permanent passive bonuses. Ctrl+click (or Cmd+click) automatically purchases every affordable mastery towards the target node.

Once a mastery's trees are fully purchased, excess points can be **dumped** for a permanent bonus (1% more per point for most masteries, 0.5% for some). Use the Dump button in the mastery tree panel; Ctrl+click (or Cmd+click) dumps all available points at once.

## Action Tags

Every action carries a **damage-type tag**: Area, Projectile, or Strike, and a **damage-source tag** : Fire, Lightning, or Physical.

The tags controls which mastery bonuses apply and how the action behaves — area hits a radius, projectiles track a single target, strikes close to melee range. The element tag controls which afflictions the action can apply and which elemental mastery bonuses it benefits from.

## Afflictions

Afflictions are byproducts of damage sources (e.g. physical, fire, lightning). They are applied to enemies by hits with a small base chance, modified by mastery nodes.

Current afflictions: **Burn** (fire), **Bleed** (physical), **Electrocution** (lightning debuff). Affliction ticks are not hits — they do not trigger life steal, double damage, or status procs unless explicitely stated.

## Multi-Action

Multi-actions are follow-up casts triggered by a primary action or by another multi-action. Each fires at a fraction of the normal cycle delay and may carry a damage penalty.

Every multi-action is a proper new cast: it can trigger afflictions, proc statuses, and roll for other multi-actions — but never re-trigger the same multi-action that produced it unless explicitely stated. A ×0.9 depth multiplier compounds with each generation.

## Speed Stockpile

**×2 speed** runs on a stockpile earned while you are away. For every 10 real seconds the game is not running (tab inactive, window closed, or paused), you earn 1 second of ×2 time, up to a maximum of 1 hour. Awards under 10 seconds are discarded.

When you return, a notification shows what you earned. While running at ×2 the stockpile drains in real time; at zero the game returns to ×1 and ×2 is locked until more is earned.

## Ascent

Ascent is a one-time escalating challenge unlocked after several Rebirths. It presents a series of increasingly difficult enemy encounters. Completing an Ascent stage rewards a permanent bonus that persists through all future Rebirths — stronger than anything available through normal mastery progression.

Ascent progress is separate from your run. You can attempt it at any time from the menu; failing an Ascent stage costs nothing.

## Action Triggers

Action triggers fire an action automatically when a condition is met. The first slot is always the **Auto attack** — it fires on a continuous timer. Additional trigger slots unlock by Ascending.

- **Slot 2** unlocks on Ascent 3. Trigger types: **Time** (periodic timer), **Mana** (fires every 100 mana spent by your actions), **Critical hit** (fires after landing a crit — unlock: kill a boss with a crit), **Affliction** (fires after accumulating affliction stacks — unlock: kill a boss with an affliction hit).
- **Slot 3** unlocks on Ascent 6 with the same trigger options.

Each extra slot applies a global damage penalty: ×0.75 for slot 2, ×0.50 for slot 3. Despite this, a well-matched second action can significantly increase total damage output.

Open the battle configuration panel (in the top bar) to change your action or configure trigger slots.

## Artifacts

Artifacts are rare items dropped by bosses once you have reached Ascension 5. Each artifact carries one positive modifier paired with one negative modifier — a risk/reward trade-off you choose to accept or reject.

When a boss is defeated, a drop card flies to the center of the screen. You can **Bag** it (keep it for later), **Equip** it immediately, or **Drop** it entirely.

Your inventory holds up to 20 artifacts. Once full, bosses stop dropping new ones until you make room.

**Equip slots** unlock with Ascent progress:
- **Ascent 5** — 1 equip slot unlocks
- **Ascent 10** — a 2nd equip slot unlocks

Only equipped artifacts apply their modifiers. All equipped artifacts' modifiers stack together.

**Rarity** is determined by how many modifier pairs the artifact has: a Light Artifact has one pair, a Medium Artifact has two, and a Heavy Artifact has three. Rarer artifacts only begin dropping at higher boss levels:
- **Boss level 30+** — Medium Artifacts (2 lines) can drop
- **Boss level 50+** — Heavy Artifacts (3 lines) can drop

To manage your collection, open the Artifacts panel from the Ascent menu (available from Ascent 5 onward). From there you can equip, unequip, or permanently delete artifacts.
