export type SfxId =
  | 'action.physical' | 'action.fire' | 'action.lightning' | 'action.cold' | 'action.rot'
  | 'enemy.death' | 'player.death' | 'ui.click' | 'boss.spawn' | 'boss.defeat'

export interface SfxDef {
  file: string
  maxVoices?: number
  throttleMs?: number
  gain?: number
  preload?: boolean
}

export const SFX: Record<SfxId, SfxDef> = {
  'action.physical':  { file: 'action_physical.ogg',  maxVoices: 4, throttleMs: 55, gain: 0.5, preload: true },
  'action.fire':      { file: 'action_fire.ogg',      maxVoices: 4, throttleMs: 55, gain: 0.5, preload: true },
  'action.lightning': { file: 'action_lightning.ogg', maxVoices: 4, throttleMs: 55, gain: 0.5, preload: true },
  'action.cold':      { file: 'action_cold.ogg',      maxVoices: 4, throttleMs: 55, gain: 0.5, preload: true },
  'action.rot':       { file: 'action_rot.ogg',       maxVoices: 4, throttleMs: 55, gain: 0.5, preload: true },
  'enemy.death':      { file: 'enemy_death.ogg',      maxVoices: 6, throttleMs: 30, gain: 0.6, preload: true },
  'player.death':     { file: 'player_death.ogg',     maxVoices: 1,                 gain: 0.9, preload: false },
  'ui.click':         { file: 'ui_click_stone.ogg',   maxVoices: 3, throttleMs: 30, gain: 0.7, preload: true },
  'boss.spawn':       { file: 'boss_spawn.ogg',       maxVoices: 1,                 gain: 0.9, preload: false },
  'boss.defeat':      { file: 'boss_defeat.ogg',      maxVoices: 1,                 gain: 0.9, preload: false },
}

export function essenceSfxId(tags: readonly string[]): SfxId {
  if (tags.includes('fire'))      return 'action.fire'
  if (tags.includes('lightning')) return 'action.lightning'
  if (tags.includes('cold'))      return 'action.cold'
  if (tags.includes('rot'))       return 'action.rot'
  return 'action.physical'
}
