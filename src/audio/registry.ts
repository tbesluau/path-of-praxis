export type SfxId =
  | 'action.physical' | 'action.fire' | 'action.lightning'
  | 'enemy.death'
  | 'ui.toggle'
  | 'modal.open' | 'modal.close'
  | 'boss.spawn' | 'boss.defeat'

export interface SfxDef {
  file: string
  maxVoices?: number
  throttleMs?: number
  gain?: number
  preload?: boolean
}

export const SFX: Record<SfxId, SfxDef> = {
  'action.physical':  { file: 'physical.ogg',   maxVoices: 7, throttleMs: 55, gain: 0.5, preload: true },
  'action.fire':      { file: 'fire.ogg',        maxVoices: 7, throttleMs: 55, gain: 0.5, preload: true },
  'action.lightning': { file: 'electric.ogg',    maxVoices: 7, throttleMs: 55, gain: 0.5, preload: true },
  'enemy.death':      { file: 'enemy_death.ogg', maxVoices: 10, throttleMs: 30, gain: 0.6, preload: true },
  'ui.toggle':        { file: 'toggle.ogg',      maxVoices: 3, throttleMs: 30, gain: 0.7, preload: true },
  'modal.open':       { file: 'modal_open.ogg',  maxVoices: 2, throttleMs: 60, gain: 0.8, preload: true },
  'modal.close':      { file: 'modal_close.ogg', maxVoices: 2, throttleMs: 60, gain: 0.8, preload: true },
  'boss.spawn':       { file: 'boss_spawn.ogg',  maxVoices: 1,                 gain: 0.9, preload: false },
  'boss.defeat':      { file: 'boss_death.ogg',  maxVoices: 1,                 gain: 0.9, preload: false },
}

// cold → electric timbre, rot → physical timbre (no separate files)
export function essenceSfxId(tags: readonly string[]): SfxId {
  if (tags.includes('fire'))      return 'action.fire'
  if (tags.includes('lightning')) return 'action.lightning'
  if (tags.includes('cold'))      return 'action.lightning'
  if (tags.includes('rot'))       return 'action.physical'
  return 'action.physical'
}
