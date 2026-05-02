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

const TYPE_LABEL: Record<string, string> = {
  small: 'Small node', strong: 'Strong node', major: 'Major node', key: 'Key node',
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
  return `${treeLabel} — ${TYPE_LABEL[nodeType(nodeIdx)]}`
}
