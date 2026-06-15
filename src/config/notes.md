## Frenzy

A **Status** (buff) gained from strike-tagged hits when the **Strike mastery — Frenzy tree** grants frenzy chance. Lasts **3 seconds**; re-gaining frenzy while it is active refreshes its duration to the full value.

**Charges:** Frenzy stacks up to **10 charges** (raised to **20** with the Frenzy tree final node). Each qualifying strike hit that passes the frenzy chance roll adds one charge, up to the maximum. Charges are tracked separately from the duration and reset to 0 when frenzy expires.

**While Frenzy is active, all actions (not just strikes) gain:**
- Increased damage — flat bonus + bonus per charge (from Frenzy mastery nodes)
- Increased action speed — flat bonus + bonus per charge (from Frenzy mastery nodes)
- Bonus chance to trigger afflictions per charge (from Frenzy node 5)

Note: frenzy can only be **gained** from strikes, but its bonuses apply to **every action** while the buff is active.

---

## Feeding Frenzy

A **Status** (buff) triggered by the **Life Steal** major node (Feeding Frenzy chance, node 5). Lasts **5 seconds**; re-triggering refreshes the duration.

**While active:**
- Life steal gains **+20% increased life stolen** (additive with mastery nodes; per-hit cap still applies)
- Life regeneration gains **+20% increased** (additive with mastery regen increase nodes; uncapped)
- Mana regeneration gains **+20% increased** (additive with mastery regen increase nodes; uncapped)

The bonuses are applied each heal or regen tick — they do not change stored DPS values or the cap calculation itself.

---

## Trance

A **Status** (buff) triggered by the **Action mastery — Trance tree** (nodes 0, 3, 5 each grant trigger chance). Lasts **3 seconds**; re-triggering refreshes the duration.

**While Trance is active, actions gain:**
- Chance to strike an **Additional Target** (Trance multi-target chance; each hit is independent)
- Increased damage (Trance damage bonus; additive)
- Increased action speed (Trance action speed bonus; additive; compresses the attack cycle)

All percentages are additive within their category across all Trance tree nodes. As long as Trance remains active, any action (including **Multi-action** actions) is eligible to roll for Additional Target.

---

## Burn

An **Affliction** (damage-over-time Effect) applied by fire-tagged actions to enemies. Multiple independent stacks can exist on the same enemy simultaneously.

**Application:**
- Base chance to apply per hit: **5%**
- Fire mastery burn apply chance nodes add to this directly (additive)
- While **Immolation** is active on the player, the apply chance gains an additional bonus from Immolation mastery nodes
- When an enemy applies burn to you with a fire-tagged attack, both the apply chance and the resulting duration are halved (no enemy-side mastery bonuses)

**Per stack:**
- Burn DPS = hit damage × **40%** (modified by fire mastery burn increased and more multipliers; the triggering hit's damage is used)
- Duration: **5 seconds** base (extended by fire mastery burn duration nodes)
- Each stack tracks its own remaining duration and DPS independently

**Interactions:**
- Burning enemies take increased damage from all sources when the Burning tree node 8 (strong) is assigned
- Burning tree node 11 causes each burn stack to splash a fraction of its DPS to nearby non-burning enemies
- Burning enemies have their fire resistance reduced (capped at 0) when the Fire Damage tree final node (node 11) is assigned
- **Immolation** is a separate self-burn on the player — it is not a burn stack and does not appear in enemy burn mechanics

---

## Burning Ground

A **tile-based** fire damage source created when a fire-tagged action lands on an enemy and the Burning Ground tree's apply roll succeeds. The whole grid tile where the triggering hit happened becomes burning ground for a fixed base duration.

**Application:**
- Base chance: **0%** — granted by Burning Ground tree apply nodes (each adds +5%)
- Triggered by any fire-tagged player hit on an enemy
- A tile already covered in burning ground is **immune** — the roll is wasted; the tile must clear (its duration must expire) before a new burning ground can be applied to it

**Damage:**
- Burning ground DPS = triggering hit damage × **20%** × (1 + burning ground increased) × (1 + burning ground more)
- Damage applies every tick to **all enemies whose tile coordinates match** the burning ground tile
- Damage numbers display in orange (same colour as burn DoT)

**Duration:**
- Base **4 seconds**, extended only by the Burning Ground tree strong node (node 2: +30% increased duration). Generic burn duration nodes do **not** extend burning ground.

**Burning Ground tree (short, 6 nodes):**
- Nodes 0 and 3 (small): +5% chance for fire actions to cause burning ground each — total +10% base
- Nodes 1 and 4 (small): +15% increased burning ground damage each
- Node 2 (strong): +30% increased burning ground damage · +30% increased burning ground duration
- Node 5 (major): Burning ground slows enemy movement and action speed by **20%** while standing on it · +10% more burning ground damage

The slow stacks multiplicatively with other speed modifiers and applies to both move speed and attack speed. Damage from burning ground is not a hit and does not trigger life steal, double damage, or status procs.

---

## Bleed

An **Affliction** (damage-over-time Effect) applied by physical-tagged actions to enemies. Multiple independent stacks can exist on the same enemy simultaneously.

**Application:**
- Base chance to apply per hit: **5%**
- Physical mastery bleed apply chance nodes add to this directly (additive)
- When an enemy applies bleed to you with a physical-tagged attack, both the apply chance and the resulting duration are halved (no enemy-side mastery bonuses)

**Per stack:**
- Bleed DPS = hit damage × **50%** (modified by physical mastery bleed increased and more multipliers; the triggering hit's damage is used)
- Duration: **2 seconds** base (extended by physical mastery bleed duration nodes)
- Each stack tracks its own remaining duration and DPS independently; only the highest-DPS stack ticks at any moment

---

## Effect

Umbrella term for in-game modifiers triggered by hits, casts, kills, and other events. Effects are organised into several distinct categories — each category has its own rules for triggering, duration, stacking, and interaction with other modifiers.

**Categories:**
- **Status** — buff, debuff, or mixed conditions on the player; shown in the effect bar at the top of the screen. Examples: **Trance**, **Feeding Frenzy**, **Immolation**.
- **Affliction** — damage-over-time effects applied to enemies, with independent stacks per enemy. Example: **Burn**.
- **Multi-action** — additional actions of a player action triggered by a primary action or by another Multi-action. Examples: **Double Action**, **Additional Target**, **Additional Projectile**, **Second Action**.
- **Proc** — per-event roll that modifies a single hit. Example: **Double Damage**.
- **Life Steal / Mana Steal** — per-hit healing or resource recovery. See **Life Steal**.

When a description mentions a generic "effect chance" without a category, see the relevant specific note for the rules that apply.

---

## Life Steal

Healing mechanic: a fraction of damage dealt to enemies is restored as player life, applied per direct hit.

**Formula:**
- Stolen = hit damage × steal% × (1 + increased stolen%)
- Capped at: max life × **1%** per instance (hard cap; increased by mastery node 2)

**Life Steal tree (short, 6 nodes):**
- Nodes 0 and 3 (small): +0.5% steal each — total +1% base
- Nodes 1 and 4 (small): +5% increased life stolen each — total +10% increased
- Node 2 (strong): +10% increased hard cap — cap becomes 1.1% of max life
- Node 5 (major): +1% chance per steal instance to trigger **Feeding Frenzy**

**Feeding Frenzy** grants an additional +20% increased life stolen additively; the cap still applies.

Life steal is applied once per direct hit. Burn ticks, Immolation self-burn, and other damage-over-time sources do not trigger life steal — unless the Life Steal tree's "You can steal from affliction damage" key node is allocated, which extends life and mana steal to **Burn** and **Bleed** tick damage from player-applied stacks.

---

## Increased

**Increased** modifiers are additive. All "+X% increased" values in the same stat category are summed into a single pool, and the total is applied as `(1 + total / 100)`.

**Example:** +15% increased damage and +5% increased damage combine to +20% increased damage — a ×1.20 multiplier.

Increased and **More** are separate multiplier layers that stack multiplicatively with each other.

---

## More

**More** modifiers are multiplicative. Each "X% more" value applies as its own independent multiplier: `× (1 + X / 100)`.

**Example:** ×1.10 more damage and ×1.05 more damage combine to ×1.155 — not ×1.15.

More multipliers are applied after all **Increased** modifiers have been summed. The result is that "more" is strictly stronger than the same value of "increased" whenever any other bonus in the same category already exists.

---

## Double Damage

A per-cast chance for the hit to deal exactly **2× its normal effective damage**. The roll happens after all other damage modifiers (including **Increased** and **More**) have been applied, so it doubles the final number.

Sourced from the Action mastery — Damage tree (double damage chance nodes). Multiple nodes add to a single cumulative chance. The roll is independent on every action — it can proc on primary actions, **Double Action** actions, and extra-target actions.

---

## Double Action

A **Multi-action** sourced from the Action mastery — Action Speed tree (double action chance nodes). Each successful roll queues a follow-up action of the same action at **1/5 of the normal cycle delay** after the primary action. The follow-up targets the same enemy (or the nearest in range if the primary target has died) and pays full mana cost.

Double Action itself has **no damage modifier** — the follow-up action deals full damage. Per the standard Multi-action rules, it can roll for **Double Damage**, trigger Statuses, Afflictions, and other Multi-actions; it cannot trigger another Double Action.

---

## Immolation

A **Status** (mixed Effect) triggered on the player when a fire-tagged action hits and passes the immolation chance roll (requires Fire mastery nodes).

**While Immolation is active:**
- Fire action damage gains a bonus (additive; stacks with other increased damage modifiers)
- Burn apply chance gains a bonus (additive; stacks with other burn chance modifiers)
- The player takes self-burn damage: DPS = last triggering hit's damage × 20%, modified by Fire mastery Immolation DPS nodes

Each triggering hit that passes the roll refreshes Immolation's duration (**5 seconds** base) and updates the self-burn DPS to the new hit's value. Only one Immolation instance can be active at a time.

Immolation is a self-burn on the player — it is distinct from **Burn** stacks on enemies and does not interact with enemy burn mechanics.

---

## Strong

A variant enemy tier. Strong enemies have **1.0–1.8× life**, **1.0–1.8× damage**, and **+20% attack speed** compared to a normal enemy of the same level. They award **×2 action XP** on kill. Identified by a **blue diamond** above the health bar.

The base spawn chance is **10%** per enemy in a wave. Enemy mastery nodes can increase this chance.

**Elite** enemies are a subset of Strong — they have additional bonuses on top.

---

## Elite

A variant enemy tier that is a stronger version of **Strong**. Elite enemies have **1.5–2.5× life**, **1.5–2.5× damage**, **+20% attack speed**, and **+20% move speed** compared to a normal enemy of the same level. They award **×3 action XP** on kill. Identified by a **purple diamond** above the health bar.

Elite enemies cannot spawn without Enemy mastery nodes that grant elite chance. Each Strong enemy has a separate roll to be upgraded to Elite based on this chance.

---

## Status

A category of **Effect** that applies to the player. Statuses are shown as icons in the effect bar at the top of the screen and modify the player's behaviour or stats while active.

**Kinds:**
- **Buff** (blue icon): a beneficial condition
- **Debuff** (red icon): a harmful condition
- **Mixed** (split icon): simultaneously beneficial and harmful

**Duration and re-triggering:** each Status has a remaining duration that counts down in real game-time. Triggering a Status that is already active refreshes its duration to the full value rather than stacking a second instance.

**Current statuses:**
- **Trance** — buff; empowers all player actions (Additional Target chance, increased damage, increased action speed)
- **Feeding Frenzy** — buff; amplifies life steal and regeneration
- **Immolation** — mixed; grants fire damage and burn-chance bonuses while inflicting self-burn DoT on the player
- **Bloodlust** — buff; physical action speed/damage and bonus bleed apply chance while active
- **Electrified** — buff; global action speed bonus and incoming damage reduction while active

---

## Affliction

A category of **Effect** that applies a debuff or damage-over-time on an enemy. Afflictions are typically applied by hits with a small base chance (modified by mastery nodes). Each is specific to a damage tag.

**Current afflictions:**
- **Burn** — fire damage-over-time, applied by fire-tagged actions
- **Electrocution** — damage-taken debuff, applied by lightning-tagged actions

**Planned afflictions:** Bleed (physical), Poison (toxin), Frozen (cold).

---

## Multi-action

A category of **Effect** in which an additional cast of a player action is triggered by a primary cast or by another Multi-action. Each Multi-action fires at a specific delay relative to the primary cooldown and may have its own damage modifier.

**Current multi-actions:**
- **Double Action** — follow-up at 1/5 cycle, full damage (Action mastery)
- **Additional Target** — follow-up against a different enemy at 1/5 cycle, full damage (Action mastery, while **Trance** is active)
- **Additional Projectile** — follow-up at 1/5 cycle, ×0.5 damage (Projectile mastery)
- **Second Action** — follow-up at 1/5 cycle, ×0.5 damage (**Split Action** rune; triggers on primary action only)
- **Jump** — follow-up at 1/5 cycle, ×0.6 damage (Lightning mastery); targets a nearby enemy from the previous target's position

**Standardised behaviour (applies to all Multi-actions):**

1. **Proper new action.** Every Multi-action cast is a real cast. It can roll for **Double Damage**, apply **Afflictions**, trigger Statuses, and roll for any other Multi-action — but it can never re-trigger the same Multi-action that produced it.
2. **Inheritance.** If a Multi-action carries a damage reduction specific to that mechanic, any new Multi-action it triggers inherits that modifier. Modifiers compound through chains: e.g. an Additional Projectile (×0.5) that triggers a Second Cast (×0.5) results in a follow-up at ×0.25 damage.
3. **Depth multiplier.** Every Multi-action level carries an additional ×0.9 multiplier. A Multi-action directly triggered by a primary cast starts at ×0.9 (before its own type modifier). Each subsequent level compounds: depth 2 is ×0.81, depth 3 is ×0.729, and so on. This stacks multiplicatively with the type-specific modifier from rule 2.
4. **Trigger order.** When several Multi-actions are eligible to roll on the same action, they evaluate from the **most generic source to the most specific**: action-tier Multi-actions first (Double Action, Additional Target), then projectile-tier (Additional Projectile), then rune-specific (Second Action), then lightning-specific (Jump). This ordering also determines which queued action fires first when multiple are pending.

---

## Additional Target

A **Multi-action** that queues a follow-up cast at **1/5 of the normal cycle** against a different in-range enemy, paying no mana. The follow-up deals full damage with no Multi-action-specific modifier.

**Sources (chances are summed into a single roll per action):**
- Action mastery — Trance tree (multi-target chance nodes), only while **Trance** is active
- Strike mastery — Additional Target tree, on any **strike**-tagged action; total chance = strike additional-target chance × (1 + strike additional-target more / 100)

Per the standard Multi-action rules, the follow-up is a proper new action — it can roll for **Double Damage**, **Double Action**, **Additional Projectile**, **Second Action**, and trigger Statuses or Afflictions. It cannot roll for another Additional Target.

---

## Additional Projectile

A **Multi-action** triggered by Projectile mastery (extra-projectile chance nodes). Each successful roll queues a follow-up projectile at **1/5 of the normal cycle**, dealing **×0.5 damage** (boosted additively by Projectile mastery extra-damage nodes), preferring a different in-range enemy when available.

Per the standard Multi-action rules, the follow-up is a proper new action — it can roll for **Double Damage**, **Double Action**, **Additional Target**, **Second Action**, and trigger Statuses or Afflictions. It cannot roll for another Additional Projectile.

**Exception — Projectile mastery key node:** when this node is taken, the first Additional Projectile rolls once more for a second Additional Projectile. Both are proper new actions; the second cannot roll for a third.

By the **inheritance** rule, any Multi-action triggered from an Additional Projectile carries the ×0.5 damage modifier forward — compounded with any further Multi-action modifier on top.

---

## Second Action

A **Multi-action** triggered by the **Split Action** key rune. Every **primary action** queues a follow-up at **1/5 of the normal cycle**, dealing **×0.5 damage**. Multi-actions (Double Action, Additional Projectile, etc.) that fire as a result of the primary do not each trigger their own Second Action.

Per the standard Multi-action rules, the follow-up is a proper new action — it can roll for **Double Damage**, **Double Action**, **Additional Target**, **Additional Projectile**, and trigger Statuses or Afflictions. It cannot trigger another Second Action.

By the **inheritance** rule, any Multi-action triggered from a Second Action carries the ×0.5 damage modifier forward — compounded with any further Multi-action modifier on top.

---

## Hit

A direct damage event produced by a single cast landing on a target. Hits are distinct from damage-over-time sources such as **Burn** stacks and **Immolation** self-burn, which deal damage continuously without being hits.

Only hits trigger mechanics that react to individual damage events:
- **Life Steal** — heals the player a fraction of hit damage
- **Double Damage** — per-cast roll that doubles the hit
- Status procs such as **Trance** and **Immolation** triggers

Affliction ticks (Burn) and Immolation self-burn are not hits and do not trigger any of the above.

---

## Mitigation

Damage mitigation is a source of damage reduction applied to incoming hits. Several independent mitigation sources can stack; the details depend on the specific source.

**Current sources:**
- **Resistance** — reduces incoming damage of a matching family (Physical, Rot, or Elemental)

More mitigation types are planned. Some Action mastery nodes allow actions to bypass all enemy damage mitigation on a per-action roll.

---

## Resistance

Player and enemy stat that reduces incoming damage from a specific damage family. Two families exist:
- **Physical & Rot** — combined into a single resistance stat
- **Elemental** — covers fire, lightning, and cold

Both player and enemies have these resistance values. Incoming damage of a matching family is reduced by the resistance percentage before being applied. The Life mastery — Resistances tree raises both player resistances; enemies roll initial values within tier-specific ranges at spawn.

Resistance is one source of **Mitigation**. **Resistance reduction** effects (e.g. Physical Resistance Breaking, Burning enemies vs Fire) lower an enemy's effective resistance below its rolled value, clamped at 0%.

---

## Action Speed

How quickly a player action fires. Higher action speed shortens the time between actions (the attack cycle), letting you deal more hits per second.

**Sources of increased action speed:**
- **Trance** Status — grants a temporary action speed bonus while active (Action mastery)
- Action mastery action speed nodes — permanent additive increases

Action speed bonuses are additive within their category. The resulting multiplier shortens the cycle proportionally — doubling action speed halves the time between actions.

---

## Electrocution

An **Affliction** applied by lightning-tagged hits. While active (base duration 3 s, refreshed on re-application), the target takes additional damage from **all sources** — this is an independent multiplier, separate from other damage-taken or damage-dealt modifiers.

When an enemy electrocutes you with a lightning-tagged attack, the apply chance and duration are both halved, and only the base 10% damage-taken multiplier applies (no enemy-side mastery bonuses).

**Damage taken formula:** base 10% + all "increased damage taken from electrocution" nodes (additive). Example: with +3 +5 +3 +8 +3 = +22%, total is 32%; all incoming damage to that enemy is ×1.32.

**Speed slow (Lightning mastery node 11):** When this node is active, electrocuted enemies have their movement speed and action speed each reduced by the full electrocution damage taken value (base + mastery increases). A value of 32% means the enemy moves and attacks at 68% of normal speed.

---

## Jump

A **Multi-action** triggered by Lightning mastery (Jump tree). After a lightning-tagged player hit, a successful roll queues a follow-up hit at **1/5 of the normal cycle**, dealing ×0.6 base damage (reduced by mastery nodes). The follow-up targets a nearby enemy measured from the **previous target's position**, not the player's.

**Target selection:** prefers the closest enemy not yet hit in the current jump chain. If all in-range enemies have already been jumped, it can re-target any of them except the one that triggered this jump.

**Jump range** is the action's normal attack range, optionally increased by the major node (+30%). Range is measured from the target that was just hit.

**Chaining (major node 5):** when active, each successful jump re-rolls for another jump with no limit. The chain continues as long as rolls succeed and valid targets exist.

**Inheritance:** each jump in a chain carries the ×0.9 depth multiplier from the Multi-action system on top of the ×0.6 jump-specific modifier. A first jump (depth 1) deals ×0.9 × 0.6 = ×0.54 damage; a second jump (depth 2) adds another ×0.9, giving ×0.486, and so on.

---

## Resistance Breaking

A **Physical mastery — Resistance Breaking** mechanic. Each physical-tagged player hit on an enemy rolls the resist-break chance; on success the enemy's combined **physical and rot resistance** is permanently reduced by **1 percentage point** (clamped at 0% — never negative). The reduction is per-enemy and persists for that enemy's lifetime; new enemies roll fresh resistance values.

**Resistance Breaking tree (short, 6 nodes):**
- Nodes 0 and 3 (small): +5% chance to permanently reduce enemy phys-rot resistance by 1% each — total +10% base
- Nodes 1 and 4 (small): +5% increased physical damage each
- Node 2 (strong): +7% chance to permanently reduce enemy phys-rot resistance · +3% increased physical action speed
- Node 5 (major): Enemies at 0% physical and rot resistance have their movement speed and action speed reduced by **20%**

The slow at 0% applies multiplicatively alongside other speed modifiers and to both move speed and attack speed (mirrors the Burning Ground slow's behaviour).

---

## Bloodlust

A **Status** (buff) on the player, sourced from the **Physical mastery — Bloodlust tree**. Each successful **Bleed** application rolls the Bloodlust trigger chance; on success the buff is applied for **4 seconds** (extended by the major node). Re-triggering refreshes its duration to the full value. The buff itself does nothing intrinsic — its bonuses are entirely defined by the Bloodlust tree nodes.

**Bloodlust tree (short, 6 nodes):**
- Nodes 0 and 3 (small): +5% chance to trigger Bloodlust on bleed application each — total +10% base
- Nodes 1 and 4 (small): Bloodlust grants +5% increased physical action speed each
- Node 2 (strong): Bloodlust grants +5% increased physical action speed and +12% increased physical damage · Physical actions during Bloodlust have +10% increased chance to apply bleed
- Node 5 (major): Bloodlust grants +5% increased physical action speed and +12% increased physical damage · +25% increased Bloodlust duration

While Bloodlust is active, the action-speed and damage bonuses apply only to **physical-tagged actions**. The bonus bleed apply chance from node 2 also applies only while Bloodlust is up. Bonuses are summed additively into the existing physical pools at runtime.

---

## Electrified

A **Status** (buff) on the player, sourced from the **Lightning mastery — Electrifying tree**. Each lightning-tagged player hit rolls the Electrify trigger chance; on success the buff is applied for **4 seconds** (extended by the strong node). Re-triggering refreshes its duration. The buff itself does nothing intrinsic — its bonuses are entirely defined by the Electrifying tree nodes.

**Electrifying tree (short, 6 nodes):**
- Nodes 0 and 3 (small): +5% chance for lightning actions to Electrify you each — total +10% base
- Nodes 1 and 4 (small): +5% increased action speed while Electrified each (applies to **all** actions, not just lightning)
- Node 2 (strong): +25% increased Electrified duration · +5% increased action speed while Electrified
- Node 5 (major): -5% damage taken from all sources while Electrified

The action-speed bonus is **global** — it applies to every player action regardless of tag. The incoming-damage reduction is applied after resistances and any other multipliers in the player damage pipeline.

---

## Area

A **damage type** alongside `projectile` and `strike`. Each action carries at most one of these three tags. An area-tagged action has a circular hit zone defined by its `area` field (in player-radius units): every enemy within that zone of the area's source takes the cast's full damage on impact.

Two targeting modes:
- **Enemy-targeted**: the action has a `range` like any other; once the targeted enemy enters that range the cast fires, and the area is centered **on the target**.
- **Self-targeted** (`selfTargeted: true`): the action has no range. Its area radius doubles as the trigger range — the cast fires the moment any enemy enters the area, and the area is centered **on the caster**.

Each enemy in the area receives an independent pending hit, so all per-hit triggers (burn, electrocute, bleed, frenzy, life/mana steal, action XP, etc.) fire once per hit enemy. Per-action triggers (trance, immolate, doubleAction, mana payment) fire once per action as usual.

---

## Knockback

A physics impulse applied to an enemy on a successful hit roll. The enemy is pushed directly away from the attacker over a brief window (200 ms).

**Base knockback range** (distance the enemy travels):
- **Area actions**: 1 player-radius unit
- **Projectile actions**: 0.5 player-radius units

Knockback mastery nodes increase the chance to knock back and can add two timed debuffs to the knocked-back enemy (independent of each other):
- **Move speed slow** — enemy movement speed is reduced for 2 seconds
- **Damage reduction** — knocked-back enemy deals less damage to the player for 2 seconds

The "more knockback range" node multiplies the base range for that action type. If an action carries both area and projectile tags, both knockback pools are checked independently and both can trigger.

---

## Tremor

A **multi-action** sourced from the **Area mastery — Tremor tree**. After an area cast resolves, every non-primary victim independently rolls the Tremor chance; on success a tremor is queued targeting that enemy.

Each tremor re-fires the same area action centered on its trigger enemy (regardless of whether the original was self-targeted or enemy-targeted), with a base **0.5× damage and 0.5× area radius** multiplier. The Tremor tree adds increased tremor damage and increased tremor radius bonuses on top of the 0.5× base.

Tremors are **free continuation casts** (no extra mana) and **stop all further multi-actions, including more tremors**. They can hit enemies that were already hit by the original cast or by another tremor — there is no de-dup across waves.

---

## Dash

A Dash consumes one charge to cover 1 second of movement in 0.1 seconds (10× speed compression). By default the player can bank up to 1 charge at a time; future key nodes can raise the cap.

Charges are gained via a per-second roll: once per second the game checks whether a new charge is awarded based on the total Dash charge chance from invested Dash mastery nodes. With no Dash nodes allocated the chance is 0% and no charges are ever granted.

By default Dash closes distance toward the nearest enemy. The Kite major node allows Dash to also fire in the kite direction (away from enemies).

A Dash in progress is cancelled immediately when the player's action animation phase begins.

---

## Kite

Kiting moves the player away from the nearest enemy when that enemy is within half the player's action range. Kite speed equals the player's effective movement speed multiplied by the total kite speed fraction from Kite mastery nodes (0.25 per small node, capping at 1.0 at four nodes).

The player never moves during the action animation phase (first one-third of the action cycle). During the waiting phase (remaining two-thirds), kiting takes priority over closing distance toward the next enemy whenever the kite condition is met.

Allocating the Kite strong node grants a flat all-resistance bonus that applies while the kiting condition is active.

---

## Mana Shield

A defensive mechanic from the **Mana mastery** that intercepts a portion of incoming damage and pays for it with mana instead of life.

When a hit lands, the Mana Shield absorbs a percentage of the damage (the absorb fraction, raised by Mana Shield tree nodes). The absorbed portion is converted to a mana cost at **200%** — absorbing 100 damage costs 200 mana. If you have insufficient mana the shield absorbs as much as your mana allows and the rest hits life normally.

**Mana Shield tree modifiers:**
- Absorb nodes raise the absorbed fraction (base 0%; only active with at least one node)
- Cost reduction nodes lower the 200% conversion rate
- Node 5: shield intercepts all damage sources, not just direct hits
- Node 11: your resistances apply to the mana cost (same reduction they provide to life damage)

---

## Mana Steal

A resource-recovery mechanic mirroring **Life Steal**: a fraction of hit damage is recovered as mana rather than life.

**Formula:**
- Stolen = hit damage × steal% × (1 + increased stolen%)
- Capped at: max mana × **1%** per instance (raised by the cap increase node)

**Mana Steal tree (short, 6 nodes):**
- Nodes 0 and 3 (small): +0.5% steal each
- Nodes 1 and 4 (small): +5% increased mana stolen each
- Node 2 (strong): +10% increased mana steal cap
- Node 5 (major): 1% chance per steal instance to trigger **Feeding Frenzy**

Mana steal is applied once per direct hit. Damage-over-time sources (burn ticks, immolation) do not trigger mana steal.

---

## Champion

A variant enemy tier above **Elite**. Champions have **2.0–4.0× life**, **2.0–4.0× damage**, **+30% attack speed**, and **+20% move speed** compared to a normal enemy of the same level. They award **×5 action XP** on kill. Identified by a **gold diamond** above the health bar.

Champions cannot spawn without Enemy mastery nodes that grant champion chance. Each Elite enemy has a separate roll to be upgraded to Champion based on this chance.

---

## Boss

The rarest and strongest enemy tier, above **Champion**. Bosses have **4.0–8.0× life**, **4.0–8.0× damage**, **+40% attack speed**, and **+30% move speed** compared to a normal enemy of the same level. They award **×10 action XP** on kill. Identified by a **red diamond** above the health bar.

Bosses cannot spawn without Enemy mastery nodes that grant boss chance. Each Champion enemy has a separate roll to be upgraded to Boss.

---

## Critical Hit

A per-action roll that multiplies hit damage. Actions all have their own base crit chance after the first ascent.

**Damage formula:**
- Crit multiplier = **2×** base (+100% bonus) plus all "increased critical hit damage" nodes (additive on the bonus portion)
- "More critical hit damage" nodes multiply the bonus portion after increased

**Example:** +20% increased crit damage → bonus = 100% × 1.20 = 120%, so crit deals ×2.20 total.

**Crit chance:**
- Each action has a base crit chance, some masteries can increase that.
- "Increased crit chance" and "more crit chance" scale the base chance multiplicatively
- Crits trigger on a per-action roll before the hit resolves; all per-hit mechanics (**Afflictions**, **Life Steal**, etc.) apply normally to a crit hit unless explicitely stated

**Example:** 3% base chance with +2% base and 50% increased chance is 7.5% total.

---

## Ignore Mitigation

A per-action roll that causes a hit to bypass all of the target's damage **Mitigation** (resistances and any other reduction). When the roll succeeds, the hit deals its full calculated damage regardless of the enemy's resistance values.

Sources of ignore-mitigation chance:
- Action mastery — Damage tree final major node: +20% chance on any action hit
- **Critical Hit** mastery — Damage tree node 5: +20% chance on critical hits
- **Critical Hit** mastery — Chance tree node 13: +10% chance for crits to ignore mitigation

Chances from multiple sources are summed into a single roll per hit. An ignored-mitigation hit does not strip the enemy's resistance — it skips the reduction for that one hit only.

---

## Frost

An **Affliction** applied by cold-tagged hits. Base apply chance is **5%** per cold hit, base duration **1 second**. While frosted, the enemy's movement speed and action speed are each reduced by **20%** (base), raised further by Frost mastery nodes.

**Immune while active:** unlike other **Afflictions**, Frost does **not** refresh. Once an enemy is frosted, further cold hits cannot re-apply or extend it until the current Frost expires.

**Cold Damage tree node 11 — frosted vulnerability:** frosted enemies take +20% increased damage from **non-cold** sources. **Shatter**, being cold damage, is excluded.

**Frost tree (full):**
- Frost apply chance: +5% each (nodes 0, 3, 6, 9) and +15% (node 8) — raises the chance any cold hit frosts the target
- Frost slow: +3% each (nodes 1, 4, 7, 10), plus +5% (node 2) and +8% (node 5) — added to both the move and action slow
- Frost duration: +10% (node 2), +20% (node 5) — extends how long Frost lasts
- Node 5 (first major): +8% increased frost slow · +20% increased frost duration
- Node 11 (second major): **15% more** frost slowing effect — a multiplier on the total slow

**Key nodes:**
- Node 12: +5% increased frost slow · 10% less frost duration
- Node 13: 20% more frost duration
- Node 14: frosted enemies deal **10% less** damage
- Node 15: +5% increased frost slow

Increased frost slow is additive; the "more" slowing effect (node 11) multiplies the summed total. Both the slow and the deal-less reduction apply multiplicatively alongside other speed and damage modifiers.

---

## Shatter

A **Cold mastery — Shatter** mechanic. When a **frosted** enemy dies, it shatters: a burst of cold deals **Area** damage to nearby enemies. Base damage is **5% of the dying enemy's maximum life**, dealt within **2 units** (player-radius) of the corpse.

Shatter damage is **cold** and is reduced by the target's elemental **Resistance** like any other cold hit. Shatter does **not** apply **Frost** and grants no **Affliction** procs — but it can kill, and a frosted enemy slain by Shatter shatters in turn, allowing chain reactions to ripple through a frosted pack.

**Shatter tree (short, 6 nodes):**
- Nodes 0, 1, 3, 4: +30% / +60% increased Shatter damage
- Node 2 (strong): +90% increased Shatter damage · +25% increased Shatter radius
- Node 5 (major): +50% **More** Shatter damage

Increased Shatter damage from the line nodes is additive; the major node's "more" multiplier is separate and multiplicative.

---

## Frozen Armor

A **Status** (buff) on the player, built up by applying **Frost** to enemies. Every **100 frosts** applied grants **1 Frozen Armor stack**, up to **10 stacks**. One stack decays every **2 seconds**. The current stack count is shown in the buff bar (snowflake icon).

By itself Frozen Armor does **nothing** — stacks accumulate and display but grant no benefit until you invest in the Frozen Armor tree. Once at least one damage-reduction node is taken, each stack reduces incoming damage from all sources (capped at **80%** total reduction).

**Frozen Armor tree (short, 6 nodes):**
- Nodes 0, 1, 3, 4: +1% damage reduction per stack each
- Node 2 (strong): +2% damage reduction per stack · +2 maximum stacks
- Node 5 (major): gain a stack every **75 frosts** instead of 100

The damage reduction is applied after resistances in the player damage pipeline.
