import { t } from '../i18n'
import type { TranslationSchema } from '../i18n/locales/en'

export type RuneType = 'minor' | 'major' | 'key'

export type RuneId =
  | 'minorDmg' | 'minorSpeed' | 'minorMana' | 'minorXp' | 'minorAll'
  | 'majorDmg' | 'majorSpeed' | 'majorMana' | 'majorXp' | 'majorAll'
  | 'keySplit' | 'keyHeavy' | 'keyManaless'

export interface RuneDef {
  id: RuneId
  type: RuneType
  label: string
  desc: string
}

export interface RuneBonuses {
  damageIncrease: number
  speedIncrease: number
  manaCostReduce: number
  xpIncrease: number
  damageMore: number
  speedMore: number
  manaCostMore: number
  xpMore: number
  splitCast: boolean
  slowHeavy: boolean
  manaless: boolean
}

export const SLOT_TYPES: RuneType[] = ['minor', 'major', 'minor', 'minor', 'major', 'key']
export const SLOT_UNLOCK_LEVELS = [5, 10, 15, 22, 30, 40]

export const allRunes: RuneDef[] = [
  { id: 'minorDmg',   type: 'minor', label: 'Damage',     desc: '+15% increased action damage' },
  { id: 'minorSpeed', type: 'minor', label: 'Speed',      desc: '+5% increased action speed' },
  { id: 'minorMana',  type: 'minor', label: 'Mana',       desc: '−10% action mana cost' },
  { id: 'minorXp',    type: 'minor', label: 'Experience', desc: '+20% increased action experience' },
  { id: 'minorAll',   type: 'minor', label: 'Sampler',    desc: '+3.75% damage / +1.25% speed / −2.5% mana cost / +5% experience' },
  { id: 'majorDmg',   type: 'major', label: 'Damage',     desc: '10% more action damage' },
  { id: 'majorSpeed', type: 'major', label: 'Speed',      desc: '5% more action speed' },
  { id: 'majorMana',  type: 'major', label: 'Mana',       desc: '20% less action mana cost' },
  { id: 'majorXp',    type: 'major', label: 'Experience', desc: '15% more action experience' },
  { id: 'majorAll',   type: 'major', label: 'Sampler',    desc: '2.5% more damage / 1.25% more speed / 5% less mana / 3.75% more experience' },
  { id: 'keySplit',    type: 'key', label: 'Split Action', desc: '×0.5 damage — every action automatically fires a second action' },
  { id: 'keyHeavy',   type: 'key', label: 'Slow & Heavy', desc: '×2 damage — ×0.5 action speed' },
  { id: 'keyManaless', type: 'key', label: 'Manaless',    desc: '×2 mana cost — action fires even when mana is insufficient' },
]

export function getRune(id: RuneId): RuneDef {
  return allRunes.find(r => r.id === id)!
}

export function runesByType(type: RuneType): RuneDef[] {
  return allRunes.filter(r => r.type === type)
}

function defaultBonuses(): RuneBonuses {
  return {
    damageIncrease: 0, speedIncrease: 0, manaCostReduce: 0, xpIncrease: 0,
    damageMore: 1, speedMore: 1, manaCostMore: 1, xpMore: 1,
    splitCast: false, slowHeavy: false, manaless: false,
  }
}

export function computeRuneBonuses(selected: (RuneId | null)[], actionLevel?: number): RuneBonuses {
  const unlocked = actionLevel != null ? unlockedSlotCount(actionLevel) : selected.length
  const b = defaultBonuses()
  for (let i = 0; i < selected.length; i++) {
    if (i >= unlocked) continue
    const id = selected[i]
    if (!id) continue
    switch (id) {
      case 'minorDmg':    b.damageIncrease += 15; break
      case 'minorSpeed':  b.speedIncrease  += 5;  break
      case 'minorMana':   b.manaCostReduce += 10; break
      case 'minorXp':     b.xpIncrease     += 20; break
      case 'minorAll':    b.damageIncrease += 3.75; b.speedIncrease += 1.25; b.manaCostReduce += 2.5; b.xpIncrease += 5; break
      case 'majorDmg':    b.damageMore     *= 1.10;  break
      case 'majorSpeed':  b.speedMore      *= 1.05;  break
      case 'majorMana':   b.manaCostMore   *= 0.80;  break
      case 'majorXp':     b.xpMore         *= 1.15;  break
      case 'majorAll':    b.damageMore *= 1.025; b.speedMore *= 1.0125; b.manaCostMore *= 0.95; b.xpMore *= 1.0375; break
      case 'keySplit':    b.splitCast  = true; break
      case 'keyHeavy':    b.slowHeavy  = true; break
      case 'keyManaless': b.manaless   = true; break
    }
  }
  return b
}

export function unlockedSlotCount(actionLevel: number): number {
  let count = 0
  for (const lvl of SLOT_UNLOCK_LEVELS) {
    if (actionLevel >= lvl) count++
  }
  return count
}

export function getRuneLabel(id: RuneId): string {
  return t('runeLabel', id as keyof TranslationSchema['runeLabel'])
}

export function getRuneDesc(id: RuneId): string {
  return t('runeDesc', id as keyof TranslationSchema['runeDesc'])
}
