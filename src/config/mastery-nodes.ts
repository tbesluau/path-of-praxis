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

  // Life mastery effects (Maximum Life tree)
  lifeMaxIncrease?: number         // additive %; stacks before the 'more' multiplier
  lifeMoreMax?: number             // 'more' %; applied as × (1 + sum/100) after increased
  lifePhysicalResistance?: number  // additive %; reduces damage from physical-tagged hits
  lifeRotResistance?: number       // additive %; reduces damage from rot-tagged hits
  lifeElementalResistance?: number // additive %; reduces damage from fire/lightning/cold hits

  // Life mastery effects (Life Regeneration tree)
  lifeRegenIncrease?: number   // additive %; mastery layer — independent of level-scaling layer
  lifeRegenFlatBonus?: number  // flat regen added after level scaling, before mastery % multiplier

  // Mana mastery effects
  manaRegenIncrease?: number    // additive %; increases mana regen rate
  manaReplenishChance?: number  // additive %; chance for a spell cast to add mana instead of spending it

  // Fire mastery effects (Burning tree)
  fireBurnApplyChance?: number          // additive %; added to base apply chance for fire-tagged hits
  fireBurnDamageIncrease?: number       // additive %; stacks before the 'more' multiplier
  fireBurnDurationIncrease?: number     // additive %; extends burn duration
  fireBurnMoreDamage?: number           // 'more' %; multiplies burn dps after increased
  fireBurningTakeIncreased?: number     // additive %; burning enemies take more damage from all sources
  fireBurnSplashFraction?: number       // additive %; non-burning neighbors take this share of burn dps

  // Fire mastery effects (Immolation tree)
  fireImmolateChance?: number          // additive %; chance to trigger immolation on fire-tagged hit
  fireImmolateDamageBonus?: number     // additive %; fire action damage bonus while immolation is active
  fireImmolateBurnChance?: number      // additive %; burn apply chance bonus while immolation is active
  fireImmolateDamageReduction?: number // additive %; reduces immolation self-burn dps
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
}

export interface LifeBonuses {
  maxLifeIncrease: number       // total additive %
  moreMaxLife: number           // total 'more' %
  physicalResistance: number    // total additive %
  rotResistance: number         // total additive %
  elementalResistance: number   // total additive %
  regenIncrease: number         // mastery-layer additive % regen multiplier
  regenFlatBonus: number        // flat regen added after level scaling
}

export interface ManaBonuses {
  regenIncrease: number    // total additive %
  replenishChance: number  // total additive %
}

export interface FireBonuses {
  burnApplyChance: number       // total additive %
  burnDamageIncrease: number    // total additive %
  burnDurationIncrease: number  // total additive %
  burnMoreDamage: number        // total 'more' %
  burningTakeIncreased: number  // total additive %; damage taken by burning enemies from any source
  burnSplashFraction: number    // total additive %; share of burn dps that splashes to non-burning neighbors
  immolateChance: number        // total additive %; chance to trigger immolation on fire hit
  immolateDamageBonus: number   // total additive %; fire damage bonus while immolation is active
  immolateBurnChance: number    // total additive %; burn apply chance bonus while immolation is active
  immolateDamageReduction: number // total additive %; immolation self-burn dps reduction
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
    // 11: double-cast guarantee — not yet implemented
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
    5: { lifeRegenFlatBonus: 1 },
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
    regenFlatBonus: 0,
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
      b.regenFlatBonus += eff.lifeRegenFlatBonus ?? 0
    }
  }
  return b
}

// ── Mana mastery node effects ──────────────────────────────────────────────
// Tree 0: Mana Regeneration (short)  Tree 1-4: not yet implemented

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
}

export function getManaNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return MANA_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeManaBonuses(nodes: number[][]): ManaBonuses {
  const b: ManaBonuses = { regenIncrease: 0, replenishChance: 0 }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getManaNodeEffect(treeIdx, nodeIdx)
      b.regenIncrease += eff.manaRegenIncrease ?? 0
      b.replenishChance += eff.manaReplenishChance ?? 0
    }
  }
  return b
}

// ── Fire mastery node effects ──────────────────────────────────────────────
// Tree 0: Burning (full-length tree)  Tree 1: Immolation (short)  Tree 2-4: not yet implemented

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
    2: { fireImmolateDamageReduction: 25 },
    3: { fireImmolateChance: 2 },
    4: { fireImmolateDamageBonus: 5, fireImmolateBurnChance: 5 },
    5: { fireImmolateChance: 5, fireImmolateDamageBonus: 10, fireImmolateBurnChance: 10, fireImmolateDamageReduction: 25 },
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
    immolateChance: 0,
    immolateDamageBonus: 0,
    immolateBurnChance: 0,
    immolateDamageReduction: 0,
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
      b.immolateChance += eff.fireImmolateChance ?? 0
      b.immolateDamageBonus += eff.fireImmolateDamageBonus ?? 0
      b.immolateBurnChance += eff.fireImmolateBurnChance ?? 0
      b.immolateDamageReduction += eff.fireImmolateDamageReduction ?? 0
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
    11: 'When double casting, the second cast is guaranteed to trigger effects',
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
    5: '+1 base life regeneration (added after level scaling, before increased %)',
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
    2: 'Immolation self-burn damage reduced by 25%',
    3: 'Fire actions have +2% chance to trigger immolation',
    4: 'While immolating: +5% increased fire damage · +5% increased chance to burn',
    5: 'Fire actions have +5% chance to trigger immolation · While immolating: +10% increased fire damage · +10% increased chance to burn · Immolation self-burn damage reduced by 25%',
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
  return `${treeLabel} — ${TYPE_LABEL[nodeType(nodeIdx)]}`
}
