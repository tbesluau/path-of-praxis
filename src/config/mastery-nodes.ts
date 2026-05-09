import type { MasteryId } from './masteries'
import { nodeType } from './masteries'

// ── Node effect types ──────────────────────────────────────────────────────

export interface NodeEffect {
  spellDamageIncrease?: number      // additive %; stacks before the 'more' multiplier
  spellDoubleDamageChance?: number  // additive %; chance to deal 2× damage on cast
  spellCastSpeedIncrease?: number   // additive %; stacks before the 'more' multiplier
  spellMoreDamage?: number          // 'more' %; applied as × (1 + sum/100) after increased
  spellMoreCastSpeed?: number       // 'more' %; applied as × (1 + sum/100) after increased
  spellDoubleCastChance?: number    // additive %; chance for a second cast at 1/5 interval

  // Trance effects (tree 2)
  spellTranceTriggerChance?: number      // additive %; chance per spell cast to trigger trance buff
  spellTranceMultiTargetChance?: number  // additive %; chance to hit an extra enemy when in trance
  spellTranceDamageIncrease?: number     // additive %; damage bonus on casts while in trance
  spellTranceCastSpeedIncrease?: number  // additive %; cast speed bonus on casts while in trance

  // Mana cost effects (tree 3)
  spellManaCostReduction?: number          // additive %; reduces effective mana cost
  spellNoManaCostChance?: number           // additive %; chance for spell to cost 0 mana (gate still applies)
  spellManaCostRandomReductionMax?: number // additive % cap; per-cast random reduction in [0, cap]
  spellRepeatNoMana?: boolean              // when true, repeated casts (e.g. double cast) skip the mana gate
  spellGuaranteedAfflictions?: boolean    // when true, second-cast hits always apply afflictions

  // Life mastery effects (Maximum Life tree)
  lifeMaxIncrease?: number         // additive %; stacks before the 'more' multiplier
  lifeMoreMax?: number             // 'more' %; applied as × (1 + sum/100) after increased
  lifePhysicalResistance?: number  // additive %; reduces damage from physical-tagged hits
  lifeRotResistance?: number       // additive %; reduces damage from rot-tagged hits
  lifeElementalResistance?: number // additive %; reduces damage from fire/lightning/cold hits

  // Life mastery effects (Life Regeneration tree)
  lifeRegenIncrease?: number       // additive %; mastery layer — independent of level-scaling layer
  lifeRegenFractionBonus?: number  // additional fraction of max life regenerated per second

  // Life mastery effects (Life Steal tree)
  lifeStealPercent?: number          // additive %; fraction of action hit damage stolen as life
  lifeStealIncrease?: number         // additive %; increases life stolen
  lifeStealCapIncrease?: number      // additive %; increases the per-hit hard cap (base 1% of max life)
  lifeFeedingFrenzyChance?: number   // additive %; chance per life-steal instance to trigger Feeding Frenzy

  // Mana mastery effects
  manaMaxIncrease?: number      // additive %; increases maximum mana before 'more' multiplier
  manaMoreMax?: number          // 'more' %; applied as × (1 + sum/100) after increased
  manaRegenIncrease?: number    // additive %; increases mana regen rate
  manaReplenishChance?: number  // additive %; chance for a spell cast to add mana instead of spending it

  // Mana mastery effects (Mana Steal tree)
  manaStealPercent?: number          // additive %; fraction of action hit damage stolen as mana
  manaStealIncrease?: number         // additive %; increases mana stolen
  manaStealCapIncrease?: number      // additive %; increases the per-hit hard cap (base 1% of max mana)
  manaFeedingFrenzyChance?: number   // additive %; chance per mana-steal instance to trigger Feeding Frenzy

  // Fire mastery effects (Burning tree)
  fireBurnApplyChance?: number          // additive %; added to base apply chance for fire-tagged hits
  fireBurnDamageIncrease?: number       // additive %; stacks before the 'more' multiplier
  fireBurnDurationIncrease?: number     // additive %; extends burn duration
  fireBurnMoreDamage?: number           // 'more' %; multiplies burn dps after increased
  fireBurningTakeIncreased?: number     // additive %; burning enemies take more damage from all sources
  fireBurnSplashFraction?: number       // additive %; non-burning neighbors take this share of burn dps
  fireBurnEnemyResistReduction?: number // flat %; burning enemies have their fire resistance reduced (capped at 0)

  // Fire mastery effects (Burning Ground tree)
  fireBurnGroundChance?: number             // additive %; chance for fire actions to cause burning ground on hit tile
  fireBurnGroundDamageIncrease?: number     // additive %; stacks before the 'more' multiplier
  fireBurnGroundDurationIncrease?: number   // additive %; extends burning ground duration
  fireBurnGroundMoreDamage?: number         // additive %; final multiplier as × (1 + sum/100)
  fireBurnGroundSlowAmount?: number         // additive %; movement and action speed slow for enemies standing on burning ground

  // Fire mastery effects (Immolation tree)
  fireImmolateChance?: number          // additive %; chance to trigger immolation on fire-tagged hit
  fireImmolateDamageBonus?: number     // additive %; fire action damage bonus while immolation is active
  fireImmolateBurnChance?: number      // additive %; burn apply chance bonus while immolation is active
  fireImmolateDamageMult?: number      // multiplicative; each node multiplies self-burn dps (e.g. 0.5 = halved)

  // Enemy mastery effects
  enemyExtraOneChance?: number    // additive percentage points to base "+1 enemy" wave roll
  enemyExtraTwoChance?: number    // additive percentage points to base "+2 enemies" wave roll
  enemyGuaranteedExtra?: number   // additive flat extra enemies per wave
  enemyStrongChance?: number      // additive percentage points to per-enemy "strong" roll
  enemyEliteChance?: number       // additive percentage points to "strong → elite" upgrade roll
  enemyMinStrongCount?: number    // additive flat: at least this many enemies in a wave are strong-or-better
  enemyMinEliteCount?: number     // additive flat: at least this many enemies in a wave are elite

  // Lightning mastery effects (Electrocution tree)
  lightningElectrocuteApplyChance?: number          // additive %; bonus chance to electrocute on lightning hits
  lightningElectrocuteDamageTakenIncrease?: number  // additive %; increases damage taken by electrocuted enemies
  lightningElectrocuteDurationIncrease?: number     // additive %; extends electrocution duration
  lightningElectrocuteSlowOnDamageTaken?: boolean   // when true, speed reduced by damageTaken value

  // Lightning mastery effects (Jump tree)
  lightningJumpChance?: number              // additive %; chance to jump to another enemy
  lightningJumpDamagePenaltyReduce?: number // additive %; reduces jump damage penalty
  lightningJumpRangeIncrease?: number       // additive %; increases jump range (from hit target)
  lightningJumpReroll?: boolean             // when true, successful jumps re-roll for another jump

  // Projectile mastery effects
  projRangeIncrease?: number      // additive %; increases range for projectile-tagged actions
  projDamageIncrease?: number     // additive %; increases damage for projectile-tagged actions
  projDamagePerRange?: number     // % per range unit; increased projectile damage per 1 unit of total range
  projExtraChance?: number        // additive %; chance to fire an extra projectile at reduced damage
  projExtraDamage?: number        // additive %; increases the damage of extra projectiles (base 50%)
  projExtraDoubleRoll?: boolean   // when extra projectile fires, roll once more for a second extra

  // Strike mastery effects (Strike Damage tree)
  strikeDamageIncrease?: number        // additive %; stacks before the 'more' multiplier
  strikeDoubleDamageChance?: number    // additive %; chance to deal 2× damage on strike
  strikeMoreDamage?: number            // 'more' %; applied as × (1 + sum/100) after increased
  strikeActionSpeedIncrease?: number   // additive %; stacks before the 'more' multiplier
  strikeAfflictionChanceIncrease?: number // additive %; bonus chance to apply afflictions on strike hits

  // Strike mastery effects (Frenzy tree)
  strikeFrenzyChance?: number              // additive %; chance per strike hit to add a Frenzy charge
  frenzyDamagePerCharge?: number           // additive %; increased damage per Frenzy charge
  frenzySpeedPerCharge?: number            // additive %; increased action speed per Frenzy charge
  frenzyFlatDamage?: number                // additive %; flat increased damage while Frenzy is active
  frenzyFlatSpeed?: number                 // additive %; flat increased action speed while Frenzy is active
  frenzyAfflictionChancePerCharge?: number // additive %; bonus affliction chance per Frenzy charge
  frenzyDurationIncrease?: number          // additive %; extends Frenzy duration
  frenzyMaxChargesBonus?: number           // flat: additional maximum Frenzy charges

  // Strike mastery effects (Strike Range tree)
  strikeRangeIncrease?: number       // additive %; increases strike action range
  strikeMoreRange?: number           // 'more' %; multiplies strike range after increased
  strikeMoreActionSpeed?: number     // 'more' %; multiplies strike action speed after increased

  // Lightning mastery effects (Lightning Damage tree)
  lightningDamageIncrease?: number       // additive %; for lightning-tagged actions
  lightningMoreDamage?: number           // 'more' %; for lightning-tagged actions
  lightningActionSpeedIncrease?: number  // additive %; for lightning-tagged actions

  // Fire mastery effects (Fire Damage tree)
  fireDamageIncrease?: number       // additive %; for fire-tagged actions
  fireMoreDamage?: number           // 'more' %; for fire-tagged actions
  fireActionSpeedIncrease?: number  // additive %; for fire-tagged actions

  // Physical mastery effects (Physical Damage tree)
  physicalDamageIncrease?: number       // additive %; for physical-tagged actions
  physicalMoreDamage?: number           // 'more' %; for physical-tagged actions
  physicalActionSpeedIncrease?: number  // additive %; for physical-tagged actions
  physicalBleedApplyChance?: number     // additive %; chance to apply bleed on physical hits

  // Physical mastery effects (Bleed tree)
  physicalBleedDamageIncrease?: number  // additive %; stacks before the 'more' multiplier
  physicalBleedDurationIncrease?: number // additive %; extends bleed duration
  physicalBleedMoreDamage?: number      // 'more' %; multiplies bleed dps after increased
  physicalBleedIgnoreResistance?: boolean // when true, bleeding ignores enemy physical resistance (no-op for now)
}

export interface SpellBonuses {
  damageIncrease: number     // total additive %
  moreDamage: number         // total 'more' %
  castSpeedIncrease: number  // total additive %
  moreCastSpeed: number      // total 'more' %
  doubleDamageChance: number // total additive %
  doubleCastChance: number   // total additive %

  tranceTriggerChance: number
  tranceMultiTargetChance: number
  tranceDamageIncrease: number
  tranceCastSpeedIncrease: number

  manaCostReduction: number
  noManaCostChance: number
  manaCostRandomReductionMax: number
  repeatNoMana: boolean
  guaranteedAfflictions: boolean
}

export interface LifeBonuses {
  maxLifeIncrease: number       // total additive %
  moreMaxLife: number           // total 'more' %
  physicalResistance: number    // total additive %
  rotResistance: number         // total additive %
  elementalResistance: number   // total additive %
  regenIncrease: number         // mastery-layer additive % regen multiplier
  regenFractionBonus: number    // additional fraction of max life regenerated per second
  lifeStealPercent: number      // total additive %; fraction of action hit damage stolen as life
  lifeStealIncrease: number     // total additive %; increases life stolen
  lifeStealCapIncrease: number  // total additive %; increases per-hit hard cap (base 1% of max life)
  feedingFrenzyChance: number   // total additive %; chance to trigger Feeding Frenzy on life steal
}

export interface ManaBonuses {
  maxManaIncrease: number  // total additive %
  moreMaxMana: number      // total 'more' %
  regenIncrease: number    // total additive %
  replenishChance: number  // total additive %
  manaStealPercent: number      // total additive %; fraction of action hit damage stolen as mana
  manaStealIncrease: number     // total additive %; increases mana stolen
  manaStealCapIncrease: number  // total additive %; increases per-hit hard cap (base 1% of max mana)
  feedingFrenzyChance: number   // total additive %; chance to trigger Feeding Frenzy on mana steal
}

export interface ProjectileBonuses {
  rangeIncrease: number     // total additive %
  damageIncrease: number    // total additive %
  damagePerRange: number    // % per range unit added to damage at attack time
  extraChance: number       // total additive %
  extraDamage: number       // total additive % (stacks on 50% base)
  extraDoubleRoll: boolean
}

export interface LightningBonuses {
  electrocuteApplyChance: number          // total additive %
  electrocuteDamageTakenIncrease: number  // total additive %
  electrocuteDurationIncrease: number     // total additive %
  electrocuteSlowOnDamageTaken: boolean
  jumpChance: number              // total additive %
  jumpDamagePenaltyReduce: number // total additive %
  jumpRangeIncrease: number       // total additive %
  jumpReroll: boolean
  damageIncrease: number          // total additive %; lightning-tagged actions
  moreDamage: number              // total 'more' %; lightning-tagged actions
  actionSpeedIncrease: number     // total additive %; lightning-tagged actions
}

export interface StrikeBonuses {
  damageIncrease: number           // total additive %
  moreDamage: number               // total 'more' %
  doubleDamageChance: number       // total additive %
  actionSpeedIncrease: number      // total additive %
  afflictionChanceIncrease: number // total additive %
  frenzyChance: number             // total additive %
  frenzyDamagePerCharge: number    // total additive %
  frenzySpeedPerCharge: number     // total additive %
  frenzyFlatDamage: number         // total additive %
  frenzyFlatSpeed: number          // total additive %
  frenzyAfflictionChancePerCharge: number // total additive %
  frenzyDurationIncrease: number   // total additive %
  frenzyMaxChargesBonus: number    // total flat
  rangeIncrease: number            // total additive %; strike action range
  moreRange: number                // total 'more' %; strike action range
  moreActionSpeed: number          // total 'more' %; strike action speed
}

export interface PhysicalBonuses {
  damageIncrease: number        // total additive %
  moreDamage: number            // total 'more' %
  actionSpeedIncrease: number   // total additive %
  bleedApplyChance: number      // total additive %
  bleedDamageIncrease: number   // total additive %
  bleedDurationIncrease: number // total additive %
  bleedMoreDamage: number       // total 'more' %
  bleedIgnoreResistance: boolean // when true, bleeding ignores enemy physical resistance (no-op for now)
}

export interface EnemyBonuses {
  extraOneChance: number    // total additive percentage points
  extraTwoChance: number    // total additive percentage points
  guaranteedExtra: number   // total flat
  strongChance: number      // total additive percentage points
  eliteChance: number       // total additive percentage points
  minStrongCount: number    // total flat (counts strong-or-elite)
  minEliteCount: number     // total flat
}

export interface FireBonuses {
  burnApplyChance: number       // total additive %
  burnDamageIncrease: number    // total additive %
  burnDurationIncrease: number  // total additive %
  burnMoreDamage: number        // total 'more' %
  burningTakeIncreased: number  // total additive %; damage taken by burning enemies from any source
  burnSplashFraction: number    // total additive %; share of burn dps that splashes to non-burning neighbors
  burnEnemyResistReduction: number // total flat %; reduced fire resistance on burning enemies (capped at 0)
  immolateChance: number        // total additive %; chance to trigger immolation on fire hit
  immolateDamageBonus: number   // total additive %; fire damage bonus while immolation is active
  immolateBurnChance: number    // total additive %; burn apply chance bonus while immolation is active
  immolateDamageMult: number      // total multiplicative; product of all self-burn dps modifiers (1.0 = no change)
  damageIncrease: number        // total additive %; fire-tagged actions
  moreDamage: number            // total 'more' %; fire-tagged actions
  actionSpeedIncrease: number   // total additive %; fire-tagged actions
  burnGroundChance: number          // total additive %; chance to cause burning ground on hit tile
  burnGroundDamageIncrease: number  // total additive %
  burnGroundDurationIncrease: number // total additive %
  burnGroundMoreDamage: number      // total additive %; final multiplier as × (1 + sum/100)
  burnGroundSlowAmount: number      // total additive %; slow applied to enemies on burning ground tiles
}

// ── Spell mastery node effects ─────────────────────────────────────────────
// Tree 0: Spell Damage  Tree 1: Cast Speed  Tree 2: Trance  Tree 3: Mana Cost  Tree 4: not implemented

type TreeEffects = Partial<Record<number, NodeEffect>>

const SPELL_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Spell Damage
    0:  { spellDamageIncrease: 5 },
    1:  { spellDoubleDamageChance: 5 },
    2:  { spellDamageIncrease: 12 },
    3:  { spellDamageIncrease: 5 },
    4:  { spellDoubleDamageChance: 5 },
    5:  { spellMoreDamage: 20 },
    6:  { spellDamageIncrease: 5 },
    7:  { spellDoubleDamageChance: 5 },
    8:  { spellDoubleDamageChance: 5, spellDamageIncrease: 5, spellCastSpeedIncrease: 5 },
    9:  { spellDamageIncrease: 5 },
    10: { spellDoubleDamageChance: 5 },
    // 11: ignore mitigation — not yet implemented
    // 12-15: key nodes — not yet defined
  },
  1: {  // Cast Speed
    0:  { spellCastSpeedIncrease: 4 },
    1:  { spellDoubleCastChance: 3 },
    2:  { spellCastSpeedIncrease: 10 },
    3:  { spellCastSpeedIncrease: 4 },
    4:  { spellDoubleCastChance: 3 },
    5:  { spellMoreCastSpeed: 20 },
    6:  { spellCastSpeedIncrease: 4 },
    7:  { spellDoubleCastChance: 3 },
    8:  { spellCastSpeedIncrease: 4, spellDoubleCastChance: 3, spellDamageIncrease: 5 },
    9:  { spellCastSpeedIncrease: 4 },
    10: { spellDoubleCastChance: 3 },
    11: { spellGuaranteedAfflictions: true },
    // 12-15: key nodes — not yet defined
  },
  2: {  // Trance (short tree — line nodes 0-5, key nodes 12-13)
    0: { spellTranceTriggerChance: 2 },
    1: { spellTranceMultiTargetChance: 5, spellTranceDamageIncrease: 5, spellTranceCastSpeedIncrease: 5 },
    2: { spellTranceTriggerChance: 5 },
    3: { spellTranceTriggerChance: 2 },
    4: { spellTranceMultiTargetChance: 5, spellTranceDamageIncrease: 5, spellTranceCastSpeedIncrease: 5 },
    5: { spellTranceTriggerChance: 3, spellTranceMultiTargetChance: 8, spellTranceDamageIncrease: 8, spellTranceCastSpeedIncrease: 8 },
    // 12-13: key nodes — not yet defined
  },
  3: {  // Mana Cost (short tree — line nodes 0-5, key nodes 12-13)
    0: { spellManaCostReduction: 10 },
    1: { spellNoManaCostChance: 10 },
    2: { spellManaCostRandomReductionMax: 33 },
    3: { spellManaCostReduction: 10 },
    4: { spellNoManaCostChance: 10 },
    5: { spellManaCostReduction: 10, spellNoManaCostChance: 10, spellRepeatNoMana: true },
    // 12-13: key nodes — not yet defined
  },
}

export function getSpellNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return SPELL_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeSpellBonuses(nodes: number[][]): SpellBonuses {
  const b: SpellBonuses = {
    damageIncrease: 0, moreDamage: 0,
    castSpeedIncrease: 0, moreCastSpeed: 0,
    doubleDamageChance: 0, doubleCastChance: 0,
    tranceTriggerChance: 0,
    tranceMultiTargetChance: 0,
    tranceDamageIncrease: 0,
    tranceCastSpeedIncrease: 0,
    manaCostReduction: 0,
    noManaCostChance: 0,
    manaCostRandomReductionMax: 0,
    repeatNoMana: false,
    guaranteedAfflictions: false,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getSpellNodeEffect(treeIdx, nodeIdx)
      b.damageIncrease += eff.spellDamageIncrease ?? 0
      b.moreDamage += eff.spellMoreDamage ?? 0
      b.castSpeedIncrease += eff.spellCastSpeedIncrease ?? 0
      b.moreCastSpeed += eff.spellMoreCastSpeed ?? 0
      b.doubleDamageChance += eff.spellDoubleDamageChance ?? 0
      b.doubleCastChance += eff.spellDoubleCastChance ?? 0
      b.tranceTriggerChance += eff.spellTranceTriggerChance ?? 0
      b.tranceMultiTargetChance += eff.spellTranceMultiTargetChance ?? 0
      b.tranceDamageIncrease += eff.spellTranceDamageIncrease ?? 0
      b.tranceCastSpeedIncrease += eff.spellTranceCastSpeedIncrease ?? 0
      b.manaCostReduction += eff.spellManaCostReduction ?? 0
      b.noManaCostChance += eff.spellNoManaCostChance ?? 0
      b.manaCostRandomReductionMax += eff.spellManaCostRandomReductionMax ?? 0
      if (eff.spellRepeatNoMana) b.repeatNoMana = true
      if (eff.spellGuaranteedAfflictions) b.guaranteedAfflictions = true
    }
  }
  return b
}

// ── Life mastery node effects ──────────────────────────────────────────────
// Tree 0: Maximum Life  Tree 1: Life Regeneration (short)  Tree 2-4: not yet implemented

const LIFE_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Maximum Life
    0:  { lifeMaxIncrease: 5 },
    1:  { lifePhysicalResistance: 5, lifeRotResistance: 5 },
    2:  { lifeMaxIncrease: 12 },
    3:  { lifeMaxIncrease: 5 },
    4:  { lifeElementalResistance: 5 },
    5:  { lifeMoreMax: 30 },
    6:  { lifeMaxIncrease: 5 },
    7:  { lifePhysicalResistance: 5, lifeRotResistance: 5 },
    8:  { lifePhysicalResistance: 7, lifeRotResistance: 7, lifeElementalResistance: 7 },
    9:  { lifeMaxIncrease: 5 },
    10: { lifeElementalResistance: 5 },
    11: { lifeMoreMax: 30 },
  },
  1: {  // Life Regeneration (short tree — line nodes 0-5, key nodes 12-13)
    0: { lifeRegenIncrease: 5 },
    1: { lifeRegenIncrease: 5 },
    2: { lifeRegenIncrease: 12 },
    3: { lifeRegenIncrease: 5 },
    4: { lifeRegenIncrease: 5 },
    5: { lifeRegenFractionBonus: 0.003 },
    // 12-13: key nodes — not yet defined
  },
  2: {  // Life Steal (short tree — line nodes 0-5, key nodes 12-13)
    0: { lifeStealPercent: 0.5 },
    1: { lifeStealIncrease: 5 },
    2: { lifeStealCapIncrease: 10 },
    3: { lifeStealPercent: 0.5 },
    4: { lifeStealIncrease: 5 },
    5: { lifeFeedingFrenzyChance: 1 },
    // 12-13: key nodes — not yet defined
  },
}

export function getLifeNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return LIFE_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeLifeBonuses(nodes: number[][]): LifeBonuses {
  const b: LifeBonuses = {
    maxLifeIncrease: 0,
    moreMaxLife: 0,
    physicalResistance: 0,
    rotResistance: 0,
    elementalResistance: 0,
    regenIncrease: 0,
    regenFractionBonus: 0,
    lifeStealPercent: 0,
    lifeStealIncrease: 0,
    lifeStealCapIncrease: 0,
    feedingFrenzyChance: 0,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getLifeNodeEffect(treeIdx, nodeIdx)
      b.maxLifeIncrease += eff.lifeMaxIncrease ?? 0
      b.moreMaxLife += eff.lifeMoreMax ?? 0
      b.physicalResistance += eff.lifePhysicalResistance ?? 0
      b.rotResistance += eff.lifeRotResistance ?? 0
      b.elementalResistance += eff.lifeElementalResistance ?? 0
      b.regenIncrease += eff.lifeRegenIncrease ?? 0
      b.regenFractionBonus += eff.lifeRegenFractionBonus ?? 0
      b.lifeStealPercent += eff.lifeStealPercent ?? 0
      b.lifeStealIncrease += eff.lifeStealIncrease ?? 0
      b.lifeStealCapIncrease += eff.lifeStealCapIncrease ?? 0
      b.feedingFrenzyChance += eff.lifeFeedingFrenzyChance ?? 0
    }
  }
  return b
}

// ── Mana mastery node effects ──────────────────────────────────────────────
// Tree 0: Mana Regeneration (short)  Tree 1: Maximum Mana (short)  Tree 2-4: not yet implemented

const MANA_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Mana Regeneration (short tree — line nodes 0-5, key nodes 12-13)
    0: { manaRegenIncrease: 5 },
    1: { manaRegenIncrease: 5 },
    2: { manaRegenIncrease: 12 },
    3: { manaRegenIncrease: 5 },
    4: { manaRegenIncrease: 5 },
    5: { manaReplenishChance: 10 },
    // 12-13: key nodes — not yet defined
  },
  1: {  // Maximum Mana (short tree — line nodes 0-5, key nodes 12-13)
    0: { manaMaxIncrease: 5 },
    1: { manaMaxIncrease: 2, manaRegenIncrease: 2 },
    2: { manaMaxIncrease: 12 },
    3: { manaMaxIncrease: 5 },
    4: { manaMaxIncrease: 2, manaRegenIncrease: 2 },
    5: { manaMoreMax: 20 },
    // 12-13: key nodes — not yet defined
  },
  2: {  // Mana Steal (short tree — line nodes 0-5, key nodes 12-13)
    0: { manaStealPercent: 0.5 },
    1: { manaStealIncrease: 5 },
    2: { manaStealCapIncrease: 10 },
    3: { manaStealPercent: 0.5 },
    4: { manaStealIncrease: 5 },
    5: { manaFeedingFrenzyChance: 1 },
    // 12-13: key nodes — not yet defined
  },
}

export function getManaNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return MANA_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeManaBonuses(nodes: number[][]): ManaBonuses {
  const b: ManaBonuses = {
    maxManaIncrease: 0, moreMaxMana: 0, regenIncrease: 0, replenishChance: 0,
    manaStealPercent: 0, manaStealIncrease: 0, manaStealCapIncrease: 0, feedingFrenzyChance: 0,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getManaNodeEffect(treeIdx, nodeIdx)
      b.maxManaIncrease      += eff.manaMaxIncrease ?? 0
      b.moreMaxMana          += eff.manaMoreMax ?? 0
      b.regenIncrease        += eff.manaRegenIncrease ?? 0
      b.replenishChance      += eff.manaReplenishChance ?? 0
      b.manaStealPercent     += eff.manaStealPercent ?? 0
      b.manaStealIncrease    += eff.manaStealIncrease ?? 0
      b.manaStealCapIncrease += eff.manaStealCapIncrease ?? 0
      b.feedingFrenzyChance  += eff.manaFeedingFrenzyChance ?? 0
    }
  }
  return b
}

// ── Fire mastery node effects ──────────────────────────────────────────────
// Tree 0: Burning (full)  Tree 1: Immolation (short)  Tree 2: Fire Damage (full)  Tree 3: Burning Ground (short)  Tree 4: not implemented

const FIRE_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Burning
    0:  { fireBurnApplyChance: 5 },
    1:  { fireBurnDamageIncrease: 5 },
    2:  { fireBurnDamageIncrease: 10, fireBurnDurationIncrease: 10 },
    3:  { fireBurnApplyChance: 5 },
    4:  { fireBurnDamageIncrease: 5 },
    5:  { fireBurnMoreDamage: 30 },
    6:  { fireBurnApplyChance: 5 },
    7:  { fireBurnDamageIncrease: 5 },
    8:  { fireBurningTakeIncreased: 10 },
    9:  { fireBurnApplyChance: 5 },
    10: { fireBurnDamageIncrease: 5 },
    11: { fireBurnSplashFraction: 50 },
    // 12-15: key nodes — not yet defined
  },
  1: {  // Immolation (short tree — line nodes 0-5, key nodes 12-13)
    0: { fireImmolateChance: 2 },
    1: { fireImmolateDamageBonus: 5, fireImmolateBurnChance: 5 },
    2: { fireImmolateDamageMult: 0.5 },
    3: { fireImmolateChance: 2 },
    4: { fireImmolateDamageBonus: 5, fireImmolateBurnChance: 5 },
    5: { fireImmolateChance: 5, fireImmolateDamageBonus: 10, fireImmolateBurnChance: 10, fireImmolateDamageMult: 0.5 },
    // 12-13: key nodes — not yet defined
  },
  2: {  // Fire Damage (full)
    0:  { fireDamageIncrease: 5 },
    1:  { fireActionSpeedIncrease: 3 },
    2:  { fireDamageIncrease: 5, fireBurnApplyChance: 5 },
    3:  { fireDamageIncrease: 5 },
    4:  { fireActionSpeedIncrease: 3 },
    5:  { fireMoreDamage: 10 },
    6:  { fireDamageIncrease: 5 },
    7:  { fireActionSpeedIncrease: 3 },
    8:  { fireDamageIncrease: 12 },
    9:  { fireDamageIncrease: 5 },
    10: { fireActionSpeedIncrease: 3 },
    11: { fireBurnEnemyResistReduction: 20 },
    // 12-15: key nodes — not yet defined
  },
  3: {  // Burning Ground (short tree — line nodes 0-5, key nodes 12-13)
    0: { fireBurnGroundChance: 5 },
    1: { fireBurnGroundDamageIncrease: 15 },
    2: { fireBurnGroundDamageIncrease: 30, fireBurnGroundDurationIncrease: 30 },
    3: { fireBurnGroundChance: 5 },
    4: { fireBurnGroundDamageIncrease: 15 },
    5: { fireBurnGroundSlowAmount: 20, fireBurnGroundMoreDamage: 10 },
    // 12-13: key nodes — not yet defined
  },
}

export function getFireNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return FIRE_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeFireBonuses(nodes: number[][]): FireBonuses {
  const b: FireBonuses = {
    burnApplyChance: 0,
    burnDamageIncrease: 0,
    burnDurationIncrease: 0,
    burnMoreDamage: 0,
    burningTakeIncreased: 0,
    burnSplashFraction: 0,
    burnEnemyResistReduction: 0,
    immolateChance: 0,
    immolateDamageBonus: 0,
    immolateBurnChance: 0,
    immolateDamageMult: 1,
    damageIncrease: 0,
    moreDamage: 0,
    actionSpeedIncrease: 0,
    burnGroundChance: 0,
    burnGroundDamageIncrease: 0,
    burnGroundDurationIncrease: 0,
    burnGroundMoreDamage: 0,
    burnGroundSlowAmount: 0,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getFireNodeEffect(treeIdx, nodeIdx)
      b.burnApplyChance += eff.fireBurnApplyChance ?? 0
      b.burnDamageIncrease += eff.fireBurnDamageIncrease ?? 0
      b.burnDurationIncrease += eff.fireBurnDurationIncrease ?? 0
      b.burnMoreDamage += eff.fireBurnMoreDamage ?? 0
      b.burningTakeIncreased += eff.fireBurningTakeIncreased ?? 0
      b.burnSplashFraction += eff.fireBurnSplashFraction ?? 0
      b.burnEnemyResistReduction += eff.fireBurnEnemyResistReduction ?? 0
      b.immolateChance += eff.fireImmolateChance ?? 0
      b.immolateDamageBonus += eff.fireImmolateDamageBonus ?? 0
      b.immolateBurnChance += eff.fireImmolateBurnChance ?? 0
      if (eff.fireImmolateDamageMult !== undefined) b.immolateDamageMult *= eff.fireImmolateDamageMult
      b.damageIncrease += eff.fireDamageIncrease ?? 0
      b.moreDamage += eff.fireMoreDamage ?? 0
      b.actionSpeedIncrease += eff.fireActionSpeedIncrease ?? 0
      b.burnGroundChance += eff.fireBurnGroundChance ?? 0
      b.burnGroundDamageIncrease += eff.fireBurnGroundDamageIncrease ?? 0
      b.burnGroundDurationIncrease += eff.fireBurnGroundDurationIncrease ?? 0
      b.burnGroundMoreDamage += eff.fireBurnGroundMoreDamage ?? 0
      b.burnGroundSlowAmount += eff.fireBurnGroundSlowAmount ?? 0
    }
  }
  return b
}

// ── Enemy mastery node effects ─────────────────────────────────────────────
// Tree 0: Enemy Quantity (short)  Tree 1: Enemy Quality (short)  Tree 2-4: not yet implemented

const ENEMY_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Enemy Quantity (short tree — line nodes 0-5, key nodes 12-13)
    0: { enemyExtraOneChance: 50 },
    1: { enemyExtraTwoChance: 25 },
    2: { enemyGuaranteedExtra: 1 },
    3: { enemyExtraOneChance: 50 },
    4: { enemyExtraTwoChance: 25 },
    5: { enemyGuaranteedExtra: 2, enemyMinStrongCount: 1 },
    // 12-13: key nodes — not yet defined
  },
  1: {  // Enemy Quality (short tree — line nodes 0-5, key nodes 12-13)
    0: { enemyStrongChance: 5 },
    1: { enemyEliteChance: 10 },
    2: { enemyStrongChance: 12 },
    3: { enemyStrongChance: 5 },
    4: { enemyEliteChance: 10 },
    5: { enemyMinStrongCount: 2, enemyMinEliteCount: 1 },
    // 12-13: key nodes — not yet defined
  },
}

export function getEnemyNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return ENEMY_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeEnemyBonuses(nodes: number[][]): EnemyBonuses {
  const b: EnemyBonuses = {
    extraOneChance: 0,
    extraTwoChance: 0,
    guaranteedExtra: 0,
    strongChance: 0,
    eliteChance: 0,
    minStrongCount: 0,
    minEliteCount: 0,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getEnemyNodeEffect(treeIdx, nodeIdx)
      b.extraOneChance += eff.enemyExtraOneChance ?? 0
      b.extraTwoChance += eff.enemyExtraTwoChance ?? 0
      b.guaranteedExtra += eff.enemyGuaranteedExtra ?? 0
      b.strongChance += eff.enemyStrongChance ?? 0
      b.eliteChance += eff.enemyEliteChance ?? 0
      b.minStrongCount += eff.enemyMinStrongCount ?? 0
      b.minEliteCount += eff.enemyMinEliteCount ?? 0
    }
  }
  return b
}

// ── Projectile mastery node effects ───────────────────────────────────────
// Tree 0: Projectile Range (short)  Tree 1: Multiple Projectiles (full)  Tree 2-4: not yet implemented

const PROJ_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Projectile Range (short tree — line nodes 0-5, key nodes 12-13)
    0: { projRangeIncrease: 5 },
    1: { projDamageIncrease: 5 },
    2: { projRangeIncrease: 12 },
    3: { projRangeIncrease: 5 },
    4: { projDamageIncrease: 5 },
    5: { projDamagePerRange: 3 },
    // 12-13: key nodes — not yet defined
  },
  1: {  // Multiple Projectiles (full tree — line nodes 0-11, key nodes 12-15)
    0:  { projExtraChance: 5 },
    1:  { projExtraDamage: 5 },
    2:  { projExtraChance: 7, projExtraDamage: 7 },
    3:  { projExtraChance: 5 },
    4:  { projExtraDamage: 5 },
    5:  { projExtraChance: 15 },
    6:  { projExtraChance: 5 },
    7:  { projExtraDamage: 5 },
    8:  { projExtraChance: 7, projExtraDamage: 7 },
    9:  { projExtraChance: 5 },
    10: { projExtraDamage: 5 },
    11: { projExtraDoubleRoll: true },
    // 12-15: key nodes — not yet defined
  },
}

export function getProjectileNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return PROJ_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeProjectileBonuses(nodes: number[][]): ProjectileBonuses {
  const b: ProjectileBonuses = {
    rangeIncrease: 0,
    damageIncrease: 0,
    damagePerRange: 0,
    extraChance: 0,
    extraDamage: 0,
    extraDoubleRoll: false,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getProjectileNodeEffect(treeIdx, nodeIdx)
      b.rangeIncrease += eff.projRangeIncrease ?? 0
      b.damageIncrease += eff.projDamageIncrease ?? 0
      b.damagePerRange += eff.projDamagePerRange ?? 0
      b.extraChance += eff.projExtraChance ?? 0
      b.extraDamage += eff.projExtraDamage ?? 0
      if (eff.projExtraDoubleRoll) b.extraDoubleRoll = true
    }
  }
  return b
}

// ── Lightning mastery node effects ────────────────────────────────────────
// Tree 0: Electrocution (full)  Tree 1: Jump (short)  Tree 2-4: not yet implemented

const LIGHTNING_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Electrocution
    0:  { lightningElectrocuteApplyChance: 5 },
    1:  { lightningElectrocuteDamageTakenIncrease: 3 },
    2:  { lightningElectrocuteDamageTakenIncrease: 5, lightningElectrocuteDurationIncrease: 10 },
    3:  { lightningElectrocuteApplyChance: 5 },
    4:  { lightningElectrocuteDamageTakenIncrease: 3 },
    5:  { lightningElectrocuteDamageTakenIncrease: 8, lightningElectrocuteDurationIncrease: 20 },
    6:  { lightningElectrocuteApplyChance: 5 },
    7:  { lightningElectrocuteDamageTakenIncrease: 3 },
    8:  { lightningElectrocuteApplyChance: 15 },
    9:  { lightningElectrocuteApplyChance: 5 },
    10: { lightningElectrocuteDamageTakenIncrease: 3 },
    11: { lightningElectrocuteSlowOnDamageTaken: true },
  },
  1: {  // Jump (short tree — line nodes 0-5, key nodes 12-13)
    0: { lightningJumpChance: 20 },
    1: { lightningJumpDamagePenaltyReduce: 10 },
    2: { lightningJumpChance: 30, lightningJumpDamagePenaltyReduce: 15 },
    3: { lightningJumpChance: 20 },
    4: { lightningJumpDamagePenaltyReduce: 10 },
    5: { lightningJumpReroll: true, lightningJumpRangeIncrease: 30 },
    // 12-13: key nodes — not yet defined
  },
  2: {  // Lightning Damage (short tree — line nodes 0-5, key nodes 12-13)
    0: { lightningDamageIncrease: 5 },
    1: { lightningActionSpeedIncrease: 3 },
    2: { lightningDamageIncrease: 5, lightningElectrocuteApplyChance: 5 },
    3: { lightningDamageIncrease: 5 },
    4: { lightningActionSpeedIncrease: 3 },
    5: { lightningMoreDamage: 10 },
    // 12-13: key nodes — not yet defined
  },
}

export function getLightningNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return LIGHTNING_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeLightningBonuses(nodes: number[][]): LightningBonuses {
  const b: LightningBonuses = {
    electrocuteApplyChance: 0,
    electrocuteDamageTakenIncrease: 0,
    electrocuteDurationIncrease: 0,
    electrocuteSlowOnDamageTaken: false,
    jumpChance: 0,
    jumpDamagePenaltyReduce: 0,
    jumpRangeIncrease: 0,
    jumpReroll: false,
    damageIncrease: 0,
    moreDamage: 0,
    actionSpeedIncrease: 0,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getLightningNodeEffect(treeIdx, nodeIdx)
      b.electrocuteApplyChance += eff.lightningElectrocuteApplyChance ?? 0
      b.electrocuteDamageTakenIncrease += eff.lightningElectrocuteDamageTakenIncrease ?? 0
      b.electrocuteDurationIncrease += eff.lightningElectrocuteDurationIncrease ?? 0
      if (eff.lightningElectrocuteSlowOnDamageTaken) b.electrocuteSlowOnDamageTaken = true
      b.jumpChance += eff.lightningJumpChance ?? 0
      b.jumpDamagePenaltyReduce += eff.lightningJumpDamagePenaltyReduce ?? 0
      b.jumpRangeIncrease += eff.lightningJumpRangeIncrease ?? 0
      if (eff.lightningJumpReroll) b.jumpReroll = true
      b.damageIncrease += eff.lightningDamageIncrease ?? 0
      b.moreDamage += eff.lightningMoreDamage ?? 0
      b.actionSpeedIncrease += eff.lightningActionSpeedIncrease ?? 0
    }
  }
  return b
}

// ── Strike mastery node effects ───────────────────────────────────────────
// Tree 0: Strike Damage (full)  Tree 1: Frenzy (full)  Tree 2-4: not yet implemented

const STRIKE_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Strike Damage
    0:  { strikeDamageIncrease: 5 },
    1:  { strikeDoubleDamageChance: 5 },
    2:  { strikeDamageIncrease: 12 },
    3:  { strikeDamageIncrease: 5 },
    4:  { strikeDoubleDamageChance: 5 },
    5:  { strikeMoreDamage: 20 },
    6:  { strikeDamageIncrease: 5 },
    7:  { strikeDoubleDamageChance: 5 },
    8:  { strikeDoubleDamageChance: 5, strikeDamageIncrease: 5, strikeActionSpeedIncrease: 5 },
    9:  { strikeDamageIncrease: 5 },
    10: { strikeDoubleDamageChance: 5 },
    11: { strikeAfflictionChanceIncrease: 20 },
  },
  1: {  // Frenzy
    0:  { strikeFrenzyChance: 5 },
    1:  { frenzyDamagePerCharge: 1, frenzySpeedPerCharge: 1 },
    2:  { strikeFrenzyChance: 5, frenzyFlatDamage: 10, frenzyFlatSpeed: 10 },
    3:  { strikeFrenzyChance: 5 },
    4:  { frenzyDamagePerCharge: 1, frenzySpeedPerCharge: 1 },
    5:  { frenzyAfflictionChancePerCharge: 1 },
    6:  { strikeFrenzyChance: 5 },
    7:  { frenzyDamagePerCharge: 1, frenzySpeedPerCharge: 1 },
    8:  { strikeFrenzyChance: 5, frenzyDurationIncrease: 20, frenzyDamagePerCharge: 1, frenzySpeedPerCharge: 1 },
    9:  { strikeFrenzyChance: 5 },
    10: { frenzyDamagePerCharge: 1, frenzySpeedPerCharge: 1 },
    11: { frenzyMaxChargesBonus: 10 },
  },
  2: {  // Strike Range (short tree — line nodes 0-5, key nodes 12-13)
    0: { strikeRangeIncrease: 5 },
    1: { strikeActionSpeedIncrease: 3 },
    2: { strikeRangeIncrease: 5, strikeDamageIncrease: 5 },
    3: { strikeRangeIncrease: 5 },
    4: { strikeActionSpeedIncrease: 3 },
    5: { strikeMoreRange: 10, strikeMoreActionSpeed: 5 },
    // 12-13: key nodes — not yet defined
  },
}

export function getStrikeNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return STRIKE_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeStrikeBonuses(nodes: number[][]): StrikeBonuses {
  const b: StrikeBonuses = {
    damageIncrease: 0, moreDamage: 0, doubleDamageChance: 0,
    actionSpeedIncrease: 0, afflictionChanceIncrease: 0,
    frenzyChance: 0, frenzyDamagePerCharge: 0, frenzySpeedPerCharge: 0,
    frenzyFlatDamage: 0, frenzyFlatSpeed: 0,
    frenzyAfflictionChancePerCharge: 0, frenzyDurationIncrease: 0, frenzyMaxChargesBonus: 0,
    rangeIncrease: 0, moreRange: 0, moreActionSpeed: 0,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getStrikeNodeEffect(treeIdx, nodeIdx)
      b.damageIncrease              += eff.strikeDamageIncrease ?? 0
      b.moreDamage                  += eff.strikeMoreDamage ?? 0
      b.doubleDamageChance          += eff.strikeDoubleDamageChance ?? 0
      b.actionSpeedIncrease         += eff.strikeActionSpeedIncrease ?? 0
      b.afflictionChanceIncrease    += eff.strikeAfflictionChanceIncrease ?? 0
      b.frenzyChance                += eff.strikeFrenzyChance ?? 0
      b.frenzyDamagePerCharge       += eff.frenzyDamagePerCharge ?? 0
      b.frenzySpeedPerCharge        += eff.frenzySpeedPerCharge ?? 0
      b.frenzyFlatDamage            += eff.frenzyFlatDamage ?? 0
      b.frenzyFlatSpeed             += eff.frenzyFlatSpeed ?? 0
      b.frenzyAfflictionChancePerCharge += eff.frenzyAfflictionChancePerCharge ?? 0
      b.frenzyDurationIncrease      += eff.frenzyDurationIncrease ?? 0
      b.frenzyMaxChargesBonus       += eff.frenzyMaxChargesBonus ?? 0
      b.rangeIncrease               += eff.strikeRangeIncrease ?? 0
      b.moreRange                   += eff.strikeMoreRange ?? 0
      b.moreActionSpeed             += eff.strikeMoreActionSpeed ?? 0
    }
  }
  return b
}

// ── Physical mastery node effects ─────────────────────────────────────────
// Tree 0: Physical Damage (short)  Tree 1-4: not yet implemented

const PHYSICAL_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Physical Damage (short tree — line nodes 0-5, key nodes 12-13)
    0: { physicalDamageIncrease: 5 },
    1: { physicalActionSpeedIncrease: 3 },
    2: { physicalDamageIncrease: 5, physicalBleedApplyChance: 5 },
    3: { physicalDamageIncrease: 5 },
    4: { physicalActionSpeedIncrease: 3 },
    5: { physicalMoreDamage: 10 },
    // 12-13: key nodes — not yet defined
  },
  1: {  // Bleed (full tree — line nodes 0-11, key nodes 12-15)
    0:  { physicalBleedApplyChance: 5 },
    1:  { physicalBleedDamageIncrease: 5 },
    2:  { physicalBleedDamageIncrease: 10, physicalBleedDurationIncrease: 10 },
    3:  { physicalBleedApplyChance: 5 },
    4:  { physicalBleedDamageIncrease: 5 },
    5:  { physicalBleedMoreDamage: 30 },
    6:  { physicalBleedApplyChance: 5 },
    7:  { physicalBleedDamageIncrease: 5 },
    8:  { physicalBleedDamageIncrease: 20 },
    9:  { physicalBleedApplyChance: 5 },
    10: { physicalBleedDamageIncrease: 5 },
    11: { physicalBleedIgnoreResistance: true },
    // 12-15: key nodes — not yet defined
  },
}

export function getPhysicalNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return PHYSICAL_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computePhysicalBonuses(nodes: number[][]): PhysicalBonuses {
  const b: PhysicalBonuses = {
    damageIncrease: 0, moreDamage: 0,
    actionSpeedIncrease: 0, bleedApplyChance: 0,
    bleedDamageIncrease: 0, bleedDurationIncrease: 0, bleedMoreDamage: 0, bleedIgnoreResistance: false,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getPhysicalNodeEffect(treeIdx, nodeIdx)
      b.damageIncrease          += eff.physicalDamageIncrease ?? 0
      b.moreDamage              += eff.physicalMoreDamage ?? 0
      b.actionSpeedIncrease     += eff.physicalActionSpeedIncrease ?? 0
      b.bleedApplyChance        += eff.physicalBleedApplyChance ?? 0
      b.bleedDamageIncrease     += eff.physicalBleedDamageIncrease ?? 0
      b.bleedDurationIncrease   += eff.physicalBleedDurationIncrease ?? 0
      b.bleedMoreDamage         += eff.physicalBleedMoreDamage ?? 0
      if (eff.physicalBleedIgnoreResistance) b.bleedIgnoreResistance = true
    }
  }
  return b
}

// ── Node description text (shown in the node detail modal) ─────────────────

const SPELL_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {
    0:  '+5% increased spell damage',
    1:  '+5% chance for spell to deal double damage',
    2:  '+12% increased spell damage',
    3:  '+5% increased spell damage',
    4:  '+5% chance for spell to deal double damage',
    5:  '+20% more spell damage',
    6:  '+5% increased spell damage',
    7:  '+5% chance for spell to deal double damage',
    8:  '+5% chance for spell to deal double damage · +5% increased spell damage · +5% increased spell cast speed',
    9:  '+5% increased spell damage',
    10: '+5% chance for spell to deal double damage',
    11: 'Spells have 50% chance to ignore all enemy damage mitigation',
  },
  1: {
    0:  '+4% increased spell cast speed',
    1:  '+3% chance for spell to double cast',
    2:  '+10% increased spell cast speed',
    3:  '+4% increased spell cast speed',
    4:  '+3% chance for spell to double cast',
    5:  '+20% more spell cast speed',
    6:  '+4% increased spell cast speed',
    7:  '+3% chance for spell to double cast',
    8:  '+4% increased spell cast speed · +3% chance for spell to double cast · +5% increased spell damage',
    9:  '+4% increased spell cast speed',
    10: '+3% chance for spell to double cast',
    11: 'When double casting, the second cast is guaranteed to trigger afflictions',
  },
  2: {
    0: 'Spells have +2% chance to trigger trance',
    1: 'Casts in trance: +5% chance to target an additional enemy · +5% increased damage · +5% increased cast speed',
    2: 'Spells have +5% chance to trigger trance',
    3: 'Spells have +2% chance to trigger trance',
    4: 'Casts in trance: +5% chance to target an additional enemy · +5% increased damage · +5% increased cast speed',
    5: 'Spells have +3% chance to trigger trance · Casts in trance: +8% chance to target an additional enemy · +8% increased damage · +8% increased cast speed',
  },
  3: {
    0: '+10% reduced spell mana cost',
    1: '+10% chance for spells to cost no mana',
    2: 'Spells cost 0–33% reduced mana (random per cast)',
    3: '+10% reduced spell mana cost',
    4: '+10% chance for spells to cost no mana',
    5: '+10% reduced spell mana cost · +10% chance for spells to cost no mana · Repeated casts ignore mana requirement',
  },
}

const LIFE_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {
    0:  '+5% increased maximum life',
    1:  '+5% physical resistance · +5% rot resistance',
    2:  '+12% increased maximum life',
    3:  '+5% increased maximum life',
    4:  '+5% elemental resistance',
    5:  '+30% more maximum life',
    6:  '+5% increased maximum life',
    7:  '+5% physical resistance · +5% rot resistance',
    8:  '+7% physical resistance · +7% rot resistance · +7% elemental resistance',
    9:  '+5% increased maximum life',
    10: '+5% elemental resistance',
    11: '+30% more maximum life',
  },
  1: {
    0: '+5% increased life regeneration',
    1: '+5% increased life regeneration',
    2: '+12% increased life regeneration',
    3: '+5% increased life regeneration',
    4: '+5% increased life regeneration',
    5: '+0.3% of maximum life regenerated per second',
  },
  2: {
    0: 'Steal +0.5% of action hit damage as life',
    1: '+5% increased life stolen',
    2: '+10% increased life steal hard cap (caps at 1% of maximum life per instance)',
    3: 'Steal +0.5% of action hit damage as life',
    4: '+5% increased life stolen',
    5: 'Stealing life has a 1% chance to trigger Feeding Frenzy (+20% life/mana steal additively, +20% life/mana regeneration additively)',
  },
}

const TYPE_LABEL: Record<string, string> = {
  small: 'Small node', strong: 'Strong node', major: 'Major node', key: 'Key node',
}

const MANA_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {
    0: '+5% increased mana regeneration',
    1: '+5% increased mana regeneration',
    2: '+12% increased mana regeneration',
    3: '+5% increased mana regeneration',
    4: '+5% increased mana regeneration',
    5: '+10% chance for a spell to replenish mana instead of depleting it',
  },
  1: {
    0: '+5% increased maximum mana',
    1: '+2% increased maximum mana · +2% increased mana regeneration',
    2: '+12% increased maximum mana',
    3: '+5% increased maximum mana',
    4: '+2% increased maximum mana · +2% increased mana regeneration',
    5: '20% more maximum mana',
  },
  2: {
    0: 'Steal +0.5% of action hit damage as mana',
    1: '+5% increased mana stolen',
    2: '+10% increased mana steal hard cap (caps at 1% of maximum mana per instance)',
    3: 'Steal +0.5% of action hit damage as mana',
    4: '+5% increased mana stolen',
    5: 'Stealing mana has a 1% chance to trigger Feeding Frenzy (+20% life/mana steal additively, +20% life/mana regeneration additively)',
  },
}

const FIRE_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {
    0:  'Fire actions have +5% chance to apply burn',
    1:  '+5% increased burn damage',
    2:  '+10% increased burn damage · +10% increased burn duration',
    3:  'Fire actions have +5% chance to apply burn',
    4:  '+5% increased burn damage',
    5:  '+30% more burn damage',
    6:  'Fire actions have +5% chance to apply burn',
    7:  '+5% increased burn damage',
    8:  'Burning enemies take +10% increased damage from all sources',
    9:  'Fire actions have +5% chance to apply burn',
    10: '+5% increased burn damage',
    11: 'Burning enemies splash 50% of their burn damage to nearby non-burning enemies',
  },
  1: {
    0: 'Fire actions have +2% chance to trigger immolation',
    1: 'While immolating: +5% increased fire damage · +5% increased chance to burn',
    2: 'Immolation self-burn damage is halved (×0.5)',
    3: 'Fire actions have +2% chance to trigger immolation',
    4: 'While immolating: +5% increased fire damage · +5% increased chance to burn',
    5: 'Fire actions have +5% chance to trigger immolation · While immolating: +10% increased fire damage · +10% increased chance to burn · Immolation self-burn damage is halved (×0.5)',
  },
  2: {
    0:  '+5% increased fire damage',
    1:  '+3% increased fire action speed',
    2:  '+5% increased fire damage · Fire actions have +5% chance to apply burn',
    3:  '+5% increased fire damage',
    4:  '+3% increased fire action speed',
    5:  '+10% more fire damage',
    6:  '+5% increased fire damage',
    7:  '+3% increased fire action speed',
    8:  '+12% increased fire damage',
    9:  '+5% increased fire damage',
    10: '+3% increased fire action speed',
    11: 'Burning enemies have 20% reduced fire resistance',
  },
  3: {  // Burning Ground
    0: 'Fire actions have +5% chance to cause burning ground',
    1: '+15% increased burning ground damage',
    2: '+30% increased burning ground damage · +30% increased burning ground duration',
    3: 'Fire actions have +5% chance to cause burning ground',
    4: '+15% increased burning ground damage',
    5: 'Burning ground slows enemy movement and action speed by 20% · +10% more burning ground damage',
  },
}

const PHYSICAL_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {
    0: '+5% increased physical damage',
    1: '+3% increased physical action speed',
    2: '+5% increased physical damage · Physical actions have +5% chance to apply bleed',
    3: '+5% increased physical damage',
    4: '+3% increased physical action speed',
    5: '+10% more physical damage',
  },
  1: {
    0:  'Physical actions have +5% chance to apply bleed',
    1:  '+5% increased bleed damage',
    2:  '+10% increased bleed damage · +10% increased bleed duration',
    3:  'Physical actions have +5% chance to apply bleed',
    4:  '+5% increased bleed damage',
    5:  '+30% more bleed damage',
    6:  'Physical actions have +5% chance to apply bleed',
    7:  '+5% increased bleed damage',
    8:  '+20% increased bleed damage',
    9:  'Physical actions have +5% chance to apply bleed',
    10: '+5% increased bleed damage',
    11: 'Bleeding ignores enemy physical resistance',
  },
}

const ENEMY_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {
    0: '+50% increased chance to spawn an additional enemy',
    1: '+25% increased chance to spawn 2 additional enemies',
    2: '+1 guaranteed enemy spawn',
    3: '+50% increased chance to spawn an additional enemy',
    4: '+25% increased chance to spawn 2 additional enemies',
    5: '+2 guaranteed enemy spawns · One enemy spawn is at least strong',
  },
  1: {
    0: '+5% increased chance for an enemy to be strong',
    1: '+10% increased chance for a strong enemy to be elite',
    2: '+12% increased chance for an enemy to be strong',
    3: '+5% increased chance for an enemy to be strong',
    4: '+10% increased chance for a strong enemy to be elite',
    5: 'One enemy spawn is at least strong · One enemy spawn is at least elite',
  },
}

export function getNodeDescription(
  masteryId: MasteryId,
  treeIdx: number,
  nodeIdx: number,
  treeLabel: string,
): string {
  if (masteryId === 'spell') {
    const desc = SPELL_DESCRIPTIONS[treeIdx]?.[nodeIdx]
    if (desc !== undefined) return desc
  }
  if (masteryId === 'life') {
    const desc = LIFE_DESCRIPTIONS[treeIdx]?.[nodeIdx]
    if (desc !== undefined) return desc
  }
  if (masteryId === 'mana') {
    const desc = MANA_DESCRIPTIONS[treeIdx]?.[nodeIdx]
    if (desc !== undefined) return desc
  }
  if (masteryId === 'fire') {
    const desc = FIRE_DESCRIPTIONS[treeIdx]?.[nodeIdx]
    if (desc !== undefined) return desc
  }
  if (masteryId === 'enemy') {
    const desc = ENEMY_DESCRIPTIONS[treeIdx]?.[nodeIdx]
    if (desc !== undefined) return desc
  }
  if (masteryId === 'projectile') {
    const desc = PROJ_DESCRIPTIONS[treeIdx]?.[nodeIdx]
    if (desc !== undefined) return desc
  }
  if (masteryId === 'lightning') {
    const desc = LIGHTNING_DESCRIPTIONS[treeIdx]?.[nodeIdx]
    if (desc !== undefined) return desc
  }
  if (masteryId === 'strike') {
    const desc = STRIKE_DESCRIPTIONS[treeIdx]?.[nodeIdx]
    if (desc !== undefined) return desc
  }
  if (masteryId === 'physical') {
    const desc = PHYSICAL_DESCRIPTIONS[treeIdx]?.[nodeIdx]
    if (desc !== undefined) return desc
  }
  return `${treeLabel} — ${TYPE_LABEL[nodeType(nodeIdx)]}`
}

const PROJ_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {
    0: '+5% increased projectile range',
    1: '+5% increased projectile damage',
    2: '+12% increased projectile range',
    3: '+5% increased projectile range',
    4: '+5% increased projectile damage',
    5: '+3% increased projectile damage per 1 range unit (minimum 3% at range 1)',
  },
  1: {
    0:  '+5% chance to fire an additional projectile at 50% damage',
    1:  '+5% increased additional projectile damage',
    2:  '+7% chance to fire an additional projectile · +7% increased additional projectile damage',
    3:  '+5% chance to fire an additional projectile',
    4:  '+5% increased additional projectile damage',
    5:  '+15% chance to fire an additional projectile',
    6:  '+5% chance to fire an additional projectile',
    7:  '+5% increased additional projectile damage',
    8:  '+7% chance to fire an additional projectile · +7% increased additional projectile damage',
    9:  '+5% chance to fire an additional projectile',
    10: '+5% increased additional projectile damage',
    11: 'When an additional projectile fires, roll once more for a second additional projectile',
  },
}

const STRIKE_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {
    0:  '+5% increased strike damage',
    1:  '+5% chance for strike to deal double damage',
    2:  '+12% increased strike damage',
    3:  '+5% increased strike damage',
    4:  '+5% chance for strike to deal double damage',
    5:  '+20% more strike damage',
    6:  '+5% increased strike damage',
    7:  '+5% chance for strike to deal double damage',
    8:  '+5% chance for strike to deal double damage · +5% increased strike damage · +5% increased action speed',
    9:  '+5% increased strike damage',
    10: '+5% chance for strike to deal double damage',
    11: 'Strikes have +20% increased chance to trigger afflictions',
  },
  1: {
    0:  'Strikes have +5% increased chance to trigger frenzy',
    1:  'Frenzy gives +1% increased damage and action speed per charge',
    2:  'Strikes have +5% increased chance to trigger frenzy · Frenzy gives a flat +10% increased damage and action speed',
    3:  'Strikes have +5% increased chance to trigger frenzy',
    4:  'Frenzy gives +1% increased damage and action speed per charge',
    5:  'Frenzy has +1% increased chance to trigger afflictions per charge',
    6:  'Strikes have +5% increased chance to trigger frenzy',
    7:  'Frenzy gives +1% increased damage and action speed per charge',
    8:  'Strikes have +5% increased chance to trigger frenzy · Frenzy has +20% increased duration · Frenzy gives +1% increased damage and action speed per charge',
    9:  'Strikes have +5% increased chance to trigger frenzy',
    10: 'Frenzy gives +1% increased damage and action speed per charge',
    11: 'Frenzy has 10 additional maximum charges',
  },
  2: {  // Strike Range
    0: '+5% increased strike range',
    1: '+3% increased strike action speed',
    2: '+5% increased strike range · +5% increased strike damage',
    3: '+5% increased strike range',
    4: '+3% increased strike action speed',
    5: '+10% more strike range · +5% more strike action speed',
  },
}

const LIGHTNING_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {  // Electrocution
    0:  'Lightning actions have +5% chance to electrocute',
    1:  '+3% increased damage taken from electrocution',
    2:  '+5% increased damage taken from electrocution · +10% increased electrocution duration',
    3:  'Lightning actions have +5% chance to electrocute',
    4:  '+3% increased damage taken from electrocution',
    5:  '+8% increased damage taken from electrocution · +20% increased electrocution duration',
    6:  'Lightning actions have +5% chance to electrocute',
    7:  '+3% increased damage taken from electrocution',
    8:  'Lightning actions have +15% chance to electrocute',
    9:  'Lightning actions have +5% chance to electrocute',
    10: '+3% increased damage taken from electrocution',
    11: 'Electrocuted enemies have their movement and action speed reduced by the electrocution damage taken value',
  },
  1: {  // Jump
    0: 'Lightning actions have +20% increased chance to jump to an additional enemy',
    1: '+10% reduced damage penalty of jump',
    2: 'Lightning actions have +30% increased chance to jump to an additional enemy · +15% reduced damage penalty of jump',
    3: 'Lightning actions have +20% increased chance to jump to an additional enemy',
    4: '+10% reduced damage penalty of jump',
    5: 'Successful jumps re-roll for another jump (unlimited chain) · +30% increased jump range',
  },
  2: {  // Lightning Damage
    0: '+5% increased lightning damage',
    1: '+3% increased lightning action speed',
    2: '+5% increased lightning damage · Lightning actions have +5% chance to electrocute',
    3: '+5% increased lightning damage',
    4: '+3% increased lightning action speed',
    5: '+10% more lightning damage',
  },
}
