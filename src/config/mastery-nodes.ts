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
}

export interface SpellBonuses {
  damageIncrease: number     // total additive %
  moreDamage: number         // total 'more' %
  castSpeedIncrease: number  // total additive %
  moreCastSpeed: number      // total 'more' %
  doubleDamageChance: number // total additive %
  doubleCastChance: number   // total additive %
}

// ── Spell mastery node effects ─────────────────────────────────────────────
// Tree 0: Spell Damage  Tree 1: Cast Speed  Trees 2-4: not yet implemented

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
}

export function getSpellNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return SPELL_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeSpellBonuses(nodes: number[][]): SpellBonuses {
  const b: SpellBonuses = {
    damageIncrease: 0, moreDamage: 0,
    castSpeedIncrease: 0, moreCastSpeed: 0,
    doubleDamageChance: 0, doubleCastChance: 0,
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
