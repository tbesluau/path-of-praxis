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

A **Status** (buff) triggered by the **Spell mastery — Trance tree** (nodes 0, 3, 5 each grant trigger chance). Lasts **3 seconds**; re-triggering refreshes the duration.

**While Trance is active, spell casts gain:**
- Chance to strike an **Additional Target** (Trance multi-target chance; each hit is independent)
- Increased damage (Trance damage bonus; additive)
- Increased cast speed (Trance cast speed bonus; additive; compresses the attack cycle)

All percentages are additive within their category across all Trance tree nodes. As long as Trance remains active, any cast (including **Multi-action** casts) is eligible to roll for Additional Target.

---

## Burn

An **Affliction** (damage-over-time Effect) applied by fire-tagged actions to enemies. Multiple independent stacks can exist on the same enemy simultaneously.

**Application:**
- Base chance to apply per hit: **5%**
- Fire mastery burn apply chance nodes add to this directly (additive)
- While **Immolation** is active on the player, the apply chance gains an additional bonus from Immolation mastery nodes

**Per stack:**
- Burn DPS = hit damage × **20%** (modified by fire mastery burn increased and more multipliers; the triggering hit's damage is used)
- Duration: **5 seconds** base (extended by fire mastery burn duration nodes)
- Each stack tracks its own remaining duration and DPS independently

**Interactions:**
- Burning enemies take increased damage from all sources when the fire mastery major node (node 5) is assigned
- Fire mastery node 11 causes each burn stack to splash a fraction of its DPS to nearby non-burning enemies
- **Immolation** is a separate self-burn on the player — it is not a burn stack and does not appear in enemy burn mechanics

---

## Effect

Umbrella term for in-game modifiers triggered by hits, casts, kills, and other events. Effects are organised into several distinct categories — each category has its own rules for triggering, duration, stacking, and interaction with other modifiers.

**Categories:**
- **Status** — buff, debuff, or mixed conditions on the player; shown in the effect bar at the top of the screen. Examples: **Trance**, **Feeding Frenzy**, **Immolation**.
- **Affliction** — damage-over-time effects applied to enemies, with independent stacks per enemy. Example: **Burn**.
- **Multi-action** — additional casts of a player action triggered by a primary cast or by another Multi-action. Examples: **Double Cast**, **Additional Target**, **Additional Projectile**, **Second Cast**.
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

Life steal is applied once per direct hit. Burn ticks, Immolation self-burn, and other damage-over-time sources do not trigger life steal.

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

Sourced from the Spell mastery — Damage tree (double damage chance nodes). Multiple nodes add to a single cumulative chance. The roll is independent on every cast — it can proc on primary casts, **Double Cast** casts, and extra-target casts.

---

## Double Cast

A **Multi-action** sourced from the Spell mastery — Cast Speed tree (double cast chance nodes). Each successful roll queues a follow-up cast of the same action at **1/5 of the normal cycle delay** after the primary cast. The follow-up targets the same enemy (or the nearest in range if the primary target has died) and pays full mana cost.

Double Cast itself has **no damage modifier** — the follow-up cast deals full damage. Per the standard Multi-action rules, it can roll for **Double Damage**, trigger Statuses, Afflictions, and other Multi-actions; it cannot trigger another Double Cast.

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
- **Trance** — buff; empowers spell casts (Additional Target chance, increased damage, increased cast speed)
- **Feeding Frenzy** — buff; amplifies life steal and regeneration
- **Immolation** — mixed; grants fire damage and burn-chance bonuses while inflicting self-burn DoT on the player

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
- **Double Cast** — follow-up at 1/5 cycle, full damage (Spell mastery)
- **Additional Target** — follow-up against a different enemy at 1/5 cycle, full damage (Spell mastery, while **Trance** is active)
- **Additional Projectile** — follow-up at 1/5 cycle, ×0.5 damage (Projectile mastery)
- **Second Cast** — follow-up at 1/5 cycle, ×0.5 damage (**Split Cast** rune; triggers on primary cast only)
- **Jump** — follow-up at 1/5 cycle, ×0.6 damage (Lightning mastery); targets a nearby enemy from the previous target's position

**Standardised behaviour (applies to all Multi-actions):**

1. **Proper new action.** Every Multi-action cast is a real cast. It can roll for **Double Damage**, apply **Afflictions**, trigger Statuses, and roll for any other Multi-action — but it can never re-trigger the same Multi-action that produced it.
2. **Inheritance.** If a Multi-action carries a damage reduction specific to that mechanic, any new Multi-action it triggers inherits that modifier. Modifiers compound through chains: e.g. an Additional Projectile (×0.5) that triggers a Second Cast (×0.5) results in a follow-up at ×0.25 damage.
3. **Depth multiplier.** Every Multi-action level carries an additional ×0.9 multiplier. A Multi-action directly triggered by a primary cast starts at ×0.9 (before its own type modifier). Each subsequent level compounds: depth 2 is ×0.81, depth 3 is ×0.729, and so on. This stacks multiplicatively with the type-specific modifier from rule 2.
4. **Trigger order.** When several Multi-actions are eligible to roll on the same cast, they evaluate from the **most generic source to the most specific**: spell-tier Multi-actions first (Double Cast, Additional Target), then projectile-tier (Additional Projectile), then rune-specific (Second Cast), then lightning-specific (Jump). This ordering also determines which queued cast fires first when multiple are pending.

---

## Additional Target

A **Multi-action** triggered by Spell mastery — Trance tree (multi-target chance nodes). Available only while the **Trance** Status is active. Each successful roll queues a follow-up cast at **1/5 of the normal cycle**, against a different in-range enemy, paying no mana. The follow-up deals full damage with no Multi-action-specific modifier.

Per the standard Multi-action rules, the follow-up is a proper new action — it can roll for **Double Damage**, **Double Cast**, **Additional Projectile**, **Second Cast**, and trigger Statuses or Afflictions. It cannot roll for another Additional Target.

---

## Additional Projectile

A **Multi-action** triggered by Projectile mastery (extra-projectile chance nodes). Each successful roll queues a follow-up projectile at **1/5 of the normal cycle**, dealing **×0.5 damage** (boosted additively by Projectile mastery extra-damage nodes), preferring a different in-range enemy when available.

Per the standard Multi-action rules, the follow-up is a proper new action — it can roll for **Double Damage**, **Double Cast**, **Additional Target**, **Second Cast**, and trigger Statuses or Afflictions. It cannot roll for another Additional Projectile.

**Exception — Projectile mastery key node:** when this node is taken, the first Additional Projectile rolls once more for a second Additional Projectile. Both are proper new actions; the second cannot roll for a third.

By the **inheritance** rule, any Multi-action triggered from an Additional Projectile carries the ×0.5 damage modifier forward — compounded with any further Multi-action modifier on top.

---

## Second Cast

A **Multi-action** triggered by the **Split Cast** key rune. Every **primary cast** queues a follow-up at **1/5 of the normal cycle**, dealing **×0.5 damage**. Multi-actions (Double Cast, Additional Projectile, etc.) that fire as a result of the primary do not each trigger their own Second Cast.

Per the standard Multi-action rules, the follow-up is a proper new action — it can roll for **Double Damage**, **Double Cast**, **Additional Target**, **Additional Projectile**, and trigger Statuses or Afflictions. It cannot trigger another Second Cast.

By the **inheritance** rule, any Multi-action triggered from a Second Cast carries the ×0.5 damage modifier forward — compounded with any further Multi-action modifier on top.

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

More mitigation types are planned. Some Spell mastery nodes allow spells to bypass all enemy damage mitigation on a per-cast roll.

---

## Resistance

Player stat that reduces incoming damage from a specific damage family. Three families exist:
- **Physical** — raised by Life mastery nodes
- **Rot** — raised by Life mastery nodes
- **Elemental** — raised by Life mastery nodes

Each resistance is a separate value. Incoming damage of a matching family is reduced by the resistance percentage before being applied to the player's life.

Resistance is one source of **Mitigation**; other mitigation types may be added in future updates.

---

## Cast Speed

How quickly a player action fires. Higher cast speed shortens the time between casts (the attack cycle), letting you deal more hits per second.

**Sources of increased cast speed:**
- **Trance** Status — grants a temporary cast speed bonus while active (Spell mastery)
- Spell mastery cast speed nodes — permanent additive increases

Cast speed bonuses are additive within their category. The resulting multiplier shortens the cycle proportionally — doubling cast speed halves the time between casts.

---

## Electrocution

An **Affliction** applied by lightning-tagged hits. While active (base duration 3 s, refreshed on re-application), the target takes additional damage from **all sources** — this is an independent multiplier, separate from other damage-taken or damage-dealt modifiers.

**Damage taken formula:** base 10% + all "increased damage taken from electrocution" nodes (additive). Example: with +3 +5 +3 +8 +3 = +22%, total is 32%; all incoming damage to that enemy is ×1.32.

**Speed slow (Lightning mastery node 11):** When this node is active, electrocuted enemies have their movement speed and action speed each reduced by the full electrocution damage taken value (base + mastery increases). A value of 32% means the enemy moves and attacks at 68% of normal speed.

---

## Jump

A **Multi-action** triggered by Lightning mastery (Jump tree). After a lightning-tagged player hit, a successful roll queues a follow-up hit at **1/5 of the normal cycle**, dealing ×0.6 base damage (reduced by mastery nodes). The follow-up targets a nearby enemy measured from the **previous target's position**, not the player's.

**Target selection:** prefers the closest enemy not yet hit in the current jump chain. If all in-range enemies have already been jumped, it can re-target any of them except the one that triggered this jump.

**Jump range** is the action's normal attack range, optionally increased by the major node (+30%). Range is measured from the target that was just hit.

**Chaining (major node 5):** when active, each successful jump re-rolls for another jump with no limit. The chain continues as long as rolls succeed and valid targets exist.

**Inheritance:** each jump in a chain carries the ×0.9 depth multiplier from the Multi-action system on top of the ×0.6 jump-specific modifier. A first jump (depth 1) deals ×0.9 × 0.6 = ×0.54 damage; a second jump (depth 2) adds another ×0.9, giving ×0.486, and so on.
