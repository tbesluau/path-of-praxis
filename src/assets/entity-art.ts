import { Assets, type Texture } from 'pixi.js'
import type { ActionDef } from '../config/actions'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Tier = 'normal' | 'strong' | 'elite' | 'champion' | 'boss' | 'player'
export type BodyVariant = 'tunic' | 'plate' | 'robe'
export type HeadVariant = 'hood' | 'helm' | 'face'

export interface EntityPalette {
  armor:      string
  armorShade: string
  trim:       string
  skin:       string
}

export interface Weapon {
  type:    'sword' | 'bow' | 'hammer' | 'staff' | 'wand'
  element?: 'fire' | 'lightning' | 'cold'
}

// ── Palettes ──────────────────────────────────────────────────────────────────

export const PALETTES: Record<Tier, EntityPalette> = {
  player:   { armor: '#2a8a80', armorShade: '#1e6b63', trim: '#3dbdb0', skin: '#f0c8a0' },
  normal:   { armor: '#7a8088', armorShade: '#565c64', trim: '#9aa0a8', skin: '#e8b890' },
  strong:   { armor: '#2e5fa8', armorShade: '#1e3f78', trim: '#5080d0', skin: '#e0b080' },
  elite:    { armor: '#7030b0', armorShade: '#501888', trim: '#a060e0', skin: '#d8a878' },
  champion: { armor: '#a07820', armorShade: '#785510', trim: '#e0b040', skin: '#e8c088' },
  boss:     { armor: '#b04810', armorShade: '#803000', trim: '#e86020', skin: '#f0a070' },
}

const ELEMENT_COLOR: Record<string, string> = {
  fire:      '#ff6a1f',
  lightning: '#46c8ff',
  cold:      '#a0d8f0',
}

// ── Variant picker ────────────────────────────────────────────────────────────

function strHash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0
  return h
}

export function pickVariants(seed: string): { body: BodyVariant; head: HeadVariant } {
  const h = strHash(seed)
  return {
    body: (['tunic', 'plate', 'robe'] as BodyVariant[])[ h        % 3],
    head: (['hood',  'helm',  'face'] as HeadVariant[])[(h >>> 8) % 3],
  }
}

// ── SVG generators ────────────────────────────────────────────────────────────

function bodySvg(v: BodyVariant, p: EntityPalette): string {
  if (v === 'plate') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 22" width="36" height="22">
  <path d="M2,4 Q2,0 7,0 L29,0 Q34,0 34,4 L32,22 L4,22 Z" fill="${p.armor}"/>
  <path d="M0,7 Q0,0 7,0 L10,0 L10,10 L0,10 Z" fill="${p.armorShade}"/>
  <path d="M36,7 Q36,0 29,0 L26,0 L26,10 L36,10 Z" fill="${p.armorShade}"/>
  <path d="M1,7 Q1,1 6,1 L9,1 L9,4 Q4,4 1,7 Z" fill="${p.trim}" opacity="0.4"/>
  <path d="M35,7 Q35,1 30,1 L27,1 L27,4 Q32,4 35,7 Z" fill="${p.trim}" opacity="0.4"/>
  <path d="M11,0 L25,0 L24,15 L18,17 L12,15 Z" fill="${p.armorShade}" opacity="0.4"/>
  <line x1="18" y1="0" x2="18" y2="15" stroke="${p.trim}" stroke-width="1.4" opacity="0.55"/>
  <rect x="5" y="17" width="26" height="4" rx="1" fill="${p.armorShade}"/>
  <circle cx="8" cy="2" r="1.1" fill="${p.trim}"/>
  <circle cx="28" cy="2" r="1.1" fill="${p.trim}"/>
  <ellipse cx="18" cy="0" rx="4" ry="2" fill="${p.skin}"/>
</svg>`

  if (v === 'robe') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 22" width="36" height="22">
  <path d="M6,0 L30,0 L34,22 L2,22 Z" fill="${p.armor}"/>
  <path d="M6,0 L10,0 L8,22 L2,22 Z" fill="${p.armorShade}" opacity="0.4"/>
  <path d="M30,0 L26,0 L28,22 L34,22 Z" fill="${p.armorShade}" opacity="0.4"/>
  <circle cx="18" cy="5" r="4" fill="${p.armorShade}"/>
  <circle cx="18" cy="5" r="2.5" fill="${p.trim}"/>
  <circle cx="18" cy="5" r="1.1" fill="${p.skin}" opacity="0.5"/>
  <line x1="18" y1="9" x2="18" y2="22" stroke="${p.trim}" stroke-width="0.9" opacity="0.35"/>
  <rect x="2" y="19" width="32" height="3" rx="1" fill="${p.armorShade}"/>
  <ellipse cx="18" cy="0" rx="7" ry="3" fill="${p.skin}"/>
</svg>`

  // tunic (default)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 22" width="36" height="22">
  <path d="M0,4 Q0,0 5,0 L31,0 Q36,0 36,4 L34,22 L2,22 Z" fill="${p.armor}"/>
  <path d="M0,4 Q0,0 5,0 L9,0 L8,9 L0,11 Z" fill="${p.armorShade}" opacity="0.45"/>
  <path d="M36,4 Q36,0 31,0 L27,0 L28,9 L36,11 Z" fill="${p.armorShade}" opacity="0.45"/>
  <rect x="4" y="16" width="28" height="4" rx="1" fill="${p.armorShade}"/>
  <rect x="15" y="15" width="6" height="6" rx="1" fill="${p.trim}"/>
  <line x1="18" y1="3" x2="18" y2="15" stroke="${p.armorShade}" stroke-width="0.8" opacity="0.45"/>
  <ellipse cx="18" cy="0" rx="5" ry="2.5" fill="${p.skin}"/>
</svg>`
}

function headSvg(v: HeadVariant, p: EntityPalette): string {
  if (v === 'helm') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 20" width="24" height="20">
  <ellipse cx="12" cy="15" rx="7" ry="5" fill="${p.skin}"/>
  <path d="M4,12 Q4,1 12,1 Q20,1 20,12 Z" fill="${p.armor}"/>
  <rect x="3" y="10" width="18" height="3" rx="1" fill="${p.armorShade}"/>
  <path d="M3,12 Q3,15 4,18 L7,18 Q6,15 5,12 Z" fill="${p.armorShade}"/>
  <path d="M21,12 Q21,15 20,18 L17,18 Q18,15 19,12 Z" fill="${p.armorShade}"/>
  <rect x="11" y="9" width="2" height="9" rx="1" fill="${p.armorShade}"/>
  <ellipse cx="9" cy="14" rx="2" ry="1.5" fill="#2a1a08"/>
  <path d="M7,2 Q10,1 12,1 Q15,1 16,3 Q12,1.5 7,2 Z" fill="${p.trim}" opacity="0.5"/>
</svg>`

  if (v === 'face') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 20" width="24" height="20">
  <ellipse cx="12" cy="13" rx="8" ry="7" fill="${p.skin}"/>
  <ellipse cx="12" cy="8" rx="8" ry="5" fill="${p.armorShade}"/>
  <ellipse cx="12" cy="7" rx="6" ry="3.5" fill="${p.armorShade}" opacity="0.5"/>
  <ellipse cx="9.5" cy="13" rx="2" ry="1.5" fill="#2a1a08"/>
  <line x1="7.5" y1="11.5" x2="11.5" y2="11" stroke="#2a1a08" stroke-width="0.8" opacity="0.55"/>
  <path d="M10,17 Q12,18.5 14,17" fill="none" stroke="#c09070" stroke-width="0.8" opacity="0.5"/>
</svg>`

  // hood (default)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 20" width="24" height="20">
  <ellipse cx="12" cy="14" rx="7" ry="6" fill="${p.skin}"/>
  <path d="M2,8 Q2,0 12,0 Q22,0 22,8 L23,20 L1,20 Z" fill="${p.armor}"/>
  <ellipse cx="12" cy="13" rx="7.5" ry="6.5" fill="${p.armorShade}" opacity="0.22"/>
  <ellipse cx="12" cy="14" rx="6" ry="5" fill="${p.skin}"/>
  <ellipse cx="10" cy="13" rx="2" ry="1.5" fill="#2a1a08" opacity="0.75"/>
  <line x1="12" y1="14" x2="12" y2="16.5" stroke="#c09070" stroke-width="0.8" opacity="0.35"/>
</svg>`
}

function legSvg(p: EntityPalette): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 18" width="10" height="18">
  <rect x="1" y="0" width="8" height="10" rx="3" fill="${p.armor}"/>
  <rect x="2" y="9" width="6" height="7" rx="2" fill="${p.armorShade}"/>
  <path d="M2,15 L8,15 Q10,16 9,18 L2,18 Q1,17 2,15 Z" fill="${p.armorShade}"/>
  <ellipse cx="5" cy="9.5" rx="3" ry="2" fill="${p.trim}" opacity="0.3"/>
</svg>`
}

function armSvg(p: EntityPalette): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 16" width="10" height="16">
  <rect x="1" y="0" width="8" height="9" rx="3" fill="${p.armor}"/>
  <rect x="2" y="8" width="6" height="6" rx="2" fill="${p.skin}"/>
  <ellipse cx="5" cy="8.5" rx="3" ry="2" fill="${p.armorShade}" opacity="0.28"/>
</svg>`
}

function weaponSvg(w: Weapon): string {
  const el = w.element ? ELEMENT_COLOR[w.element] ?? '#ffffff' : '#ffffff'

  if (w.type === 'sword') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 38" width="10" height="38">
  <path d="M5,0 L7,2 L7,26 L5,28 L3,26 L3,2 Z" fill="#c4c8cc"/>
  <line x1="5" y1="2" x2="5" y2="25" stroke="#e0e4e8" stroke-width="0.9" opacity="0.7"/>
  <rect x="0" y="26" width="10" height="3" rx="1" fill="#808898"/>
  <rect x="3" y="29" width="4" height="7" rx="1.5" fill="#6a4020"/>
  <line x1="3.5" y1="31.5" x2="6.5" y2="31.5" stroke="#4a2810" stroke-width="0.9"/>
  <line x1="3.5" y1="33.5" x2="6.5" y2="33.5" stroke="#4a2810" stroke-width="0.9"/>
  <ellipse cx="5" cy="36" rx="3" ry="2" fill="#808898"/>
</svg>`

  if (w.type === 'bow') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 36" width="16" height="36">
  <path d="M8,0 Q2,4 2,18 Q2,32 8,36" fill="none" stroke="#8a5a20" stroke-width="3" stroke-linecap="round"/>
  <line x1="8" y1="0" x2="8" y2="36" stroke="#e0d090" stroke-width="1" opacity="0.85"/>
  <rect x="6" y="15" width="4" height="6" rx="1" fill="#6a4010"/>
  <circle cx="8" cy="2" r="2" fill="#a07040"/>
  <circle cx="8" cy="34" r="2" fill="#a07040"/>
</svg>`

  if (w.type === 'hammer') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 38" width="18" height="38">
  <rect x="1" y="0" width="16" height="12" rx="2" fill="#909098"/>
  <rect x="1" y="0" width="16" height="3" rx="2" fill="#b0b4b8"/>
  <rect x="1" y="9" width="16" height="3" rx="1" fill="#808088"/>
  <rect x="7" y="12" width="4" height="22" rx="2" fill="#8a6030"/>
  <line x1="6.5" y1="26" x2="11.5" y2="26" stroke="#6a4010" stroke-width="1"/>
  <line x1="6.5" y1="29" x2="11.5" y2="29" stroke="#6a4010" stroke-width="1"/>
  <ellipse cx="9" cy="35" rx="4" ry="3" fill="#909098"/>
</svg>`

  if (w.type === 'staff') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 46" width="12" height="46">
  <rect x="4.5" y="12" width="3" height="34" rx="1.5" fill="#6a4820"/>
  <rect x="3.5" y="18" width="5" height="2" rx="1" fill="#8a6840"/>
  <path d="M4,10 Q4,12 6,12 Q8,12 8,10 Z" fill="#706858"/>
  <circle cx="6" cy="6" r="6" fill="${el}" opacity="0.28"/>
  <circle cx="6" cy="6" r="4.5" fill="${el}" opacity="0.88"/>
  <circle cx="4.5" cy="4.5" r="2" fill="white" opacity="0.45"/>
  <circle cx="6" cy="6" r="2" fill="white" opacity="0.18"/>
</svg>`

  // wand (default for elemental melee)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 28" width="10" height="28">
  <rect x="4" y="10" width="2" height="18" rx="1" fill="#5a3820"/>
  <rect x="3" y="21" width="4" height="3" rx="1" fill="#3a2010"/>
  <circle cx="5" cy="5" r="5" fill="${el}" opacity="0.28"/>
  <circle cx="5" cy="5" r="3.5" fill="${el}" opacity="0.88"/>
  <circle cx="3.8" cy="3.8" r="1.5" fill="white" opacity="0.48"/>
</svg>`
}

// ── Weapon-for-action mapping ─────────────────────────────────────────────────

export function weaponForAction(action: ActionDef): Weapon {
  const isElemental = action.tags.some(t => t === 'fire' || t === 'lightning' || t === 'cold')
  const element = action.tags.find(t => t === 'fire' || t === 'lightning' || t === 'cold') as
    'fire' | 'lightning' | 'cold' | undefined
  const isArea = action.tags.includes('area')
  if (isElemental) return { type: isArea ? 'staff' : 'wand', element }
  if (isArea) return { type: 'hammer' }
  if (action.range > 4) return { type: 'bow' }
  return { type: 'sword' }
}

// ── Texture preload cache ─────────────────────────────────────────────────────

const texCache = new Map<string, Texture>()

function loadSvgTex(key: string, svg: string): Promise<void> {
  return Assets.load<Texture>(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`)
    .then(t => { texCache.set(key, t) })
}

export async function preloadEntityArt(): Promise<void> {
  const tiers = Object.keys(PALETTES) as Tier[]
  const tasks: Promise<void>[] = []

  for (const tier of tiers) {
    const p = PALETTES[tier]
    for (const v of ['tunic', 'plate', 'robe'] as BodyVariant[]) {
      tasks.push(loadSvgTex(`body_${v}_${tier}`, bodySvg(v, p)))
    }
    for (const v of ['hood', 'helm', 'face'] as HeadVariant[]) {
      tasks.push(loadSvgTex(`head_${v}_${tier}`, headSvg(v, p)))
    }
    tasks.push(loadSvgTex(`leg_${tier}`,  legSvg(p)))
    tasks.push(loadSvgTex(`arm_${tier}`,  armSvg(p)))
  }

  // Non-elemental weapons
  for (const type of ['sword', 'bow', 'hammer'] as const) {
    tasks.push(loadSvgTex(`weapon_${type}`, weaponSvg({ type })))
  }
  // Elemental weapons
  for (const el of ['fire', 'lightning', 'cold'] as const) {
    tasks.push(loadSvgTex(`weapon_staff_${el}`,  weaponSvg({ type: 'staff', element: el })))
    tasks.push(loadSvgTex(`weapon_wand_${el}`,   weaponSvg({ type: 'wand',  element: el })))
  }

  await Promise.all(tasks)
}

export function getBodyTex(v: BodyVariant, tier: Tier): Texture {
  return texCache.get(`body_${v}_${tier}`)!
}
export function getHeadTex(v: HeadVariant, tier: Tier): Texture {
  return texCache.get(`head_${v}_${tier}`)!
}
export function getLegTex(tier: Tier): Texture {
  return texCache.get(`leg_${tier}`)!
}
export function getArmTex(tier: Tier): Texture {
  return texCache.get(`arm_${tier}`)!
}
export function getWeaponTex(w: Weapon): Texture {
  const key = w.element ? `weapon_${w.type}_${w.element}` : `weapon_${w.type}`
  return texCache.get(key)!
}
