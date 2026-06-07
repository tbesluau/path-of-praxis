import { Assets, type Texture } from 'pixi.js'
import type { ActionDef } from '../config/actions'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Tier = 'normal' | 'strong' | 'elite' | 'champion' | 'boss' | 'player'
export type BodyVariant = 'tunic' | 'plate' | 'robe'
export type HeadVariant = 'hood' | 'helm' | 'face' | 'hat' | 'horned' | 'bascinet'
export type PlayerColorKey = 'teal' | 'red' | 'orange' | 'white' | 'black'

export const HEAD_VARIANT_LABELS: Record<HeadVariant, string> = {
  hood:     'Hood',
  helm:     'Helmet',
  face:     'Cap',
  hat:      'Pointy Hat',
  horned:   'Horned Helm',
  bascinet: 'Bascinet',
}

export const PLAYER_COLOR_LABELS: Record<PlayerColorKey, string> = {
  teal:   'Teal',
  red:    'Red',
  orange: 'Orange',
  white:  'Silver',
  black:  'Black',
}

export const PLAYER_COLOR_SWATCHES: Record<PlayerColorKey, string> = {
  teal:   '#2a8a80',
  red:    '#bc1c1c',
  orange: '#b04810',
  white:  '#c8c8c8',
  black:  '#282828',
}

export interface EntityPalette {
  armor:      string
  armorShade: string
  trim:       string
  skin:       string
}

export interface Weapon {
  type:    'sword' | 'bow' | 'hammer' | 'staff' | 'wand' | 'bomb' | 'branch_staff' | 'lightning_bolt'
  element?: 'fire' | 'lightning' | 'cold'
}

// ── Palettes ──────────────────────────────────────────────────────────────────

export const PALETTES: Record<Tier, EntityPalette> = {
  player:   { armor: '#2a8a80', armorShade: '#1e6b63', trim: '#3dbdb0', skin: '#f0c8a0' },
  normal:   { armor: '#7a8088', armorShade: '#565c64', trim: '#9aa0a8', skin: '#e8b890' },
  strong:   { armor: '#2e5fa8', armorShade: '#1e3f78', trim: '#5080d0', skin: '#e0b080' },
  elite:    { armor: '#7030b0', armorShade: '#501888', trim: '#a060e0', skin: '#d8a878' },
  champion: { armor: '#a07820', armorShade: '#785510', trim: '#e0b040', skin: '#e8c088' },
  boss:     { armor: '#bc1c1c', armorShade: '#831010', trim: '#e83838', skin: '#f0a070' },
}

export const PLAYER_COLOR_PALETTES: Record<PlayerColorKey, EntityPalette> = {
  teal:   { armor: '#2a8a80', armorShade: '#1e6b63', trim: '#3dbdb0', skin: '#f0c8a0' },
  red:    { armor: '#bc1c1c', armorShade: '#831010', trim: '#e83838', skin: '#f0c8a0' },
  orange: { armor: '#b04810', armorShade: '#7a2f06', trim: '#e87030', skin: '#f0c8a0' },
  white:  { armor: '#c8c8c8', armorShade: '#999999', trim: '#eeeeee', skin: '#f0c8a0' },
  black:  { armor: '#282828', armorShade: '#141414', trim: '#505050', skin: '#f0c8a0' },
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
    body: (['tunic', 'plate', 'robe'] as BodyVariant[])[h % 3],
    head: (['hood', 'helm', 'face', 'hat', 'horned', 'bascinet'] as HeadVariant[])[(h >>> 8) % 6],
  }
}

// ── SVG generators ────────────────────────────────────────────────────────────

// Reusable outline attributes (baked into inline SVG attributes so they survive
// texture load). OLb = bold silhouette, OL = standard, OLs = small inner detail.
const OLb = 'stroke="#000" stroke-width="1.5" stroke-linejoin="round"'
const OL  = 'stroke="#000" stroke-width="1.1" stroke-linejoin="round"'
const OLs = 'stroke="#111" stroke-width="0.8"'

function bodySvg(v: BodyVariant, p: EntityPalette): string {
  if (v === 'plate') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 22" width="36" height="22">
  <ellipse cx="18" cy="1" rx="4" ry="2.4" fill="${p.skin}" ${OLs}/>
  <path d="M2,4 Q2,0 7,0 L29,0 Q34,0 34,4 L32,22 L4,22 Z" fill="${p.armor}" ${OLb}/>
  <path d="M0,7 Q0,0 7,0 L10,0 L10,10 L0,10 Z" fill="${p.armorShade}" ${OL}/>
  <path d="M36,7 Q36,0 29,0 L26,0 L26,10 L36,10 Z" fill="${p.armorShade}" ${OL}/>
  <path d="M11,0 L25,0 L24,15 L18,17 L12,15 Z" fill="${p.armorShade}" ${OLs}/>
  <line x1="18" y1="1" x2="18" y2="15" stroke="#000" stroke-width="1" opacity="0.7"/>
  <rect x="5" y="17" width="26" height="4" rx="1" fill="${p.armorShade}" ${OL}/>
  <circle cx="8" cy="2.5" r="1.3" fill="${p.trim}" ${OLs}/>
  <circle cx="28" cy="2.5" r="1.3" fill="${p.trim}" ${OLs}/>
</svg>`

  if (v === 'robe') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 22" width="36" height="22">
  <ellipse cx="18" cy="1" rx="7" ry="3" fill="${p.skin}" ${OLs}/>
  <path d="M6,0 L30,0 L34,22 L2,22 Z" fill="${p.armor}" ${OLb}/>
  <path d="M6,0 L10,0 L8,22 L2,22 Z" fill="${p.armorShade}" opacity="0.4"/>
  <path d="M30,0 L26,0 L28,22 L34,22 Z" fill="${p.armorShade}" opacity="0.4"/>
  <circle cx="18" cy="5" r="4" fill="${p.armorShade}" ${OL}/>
  <circle cx="18" cy="5" r="2.5" fill="${p.trim}" ${OLs}/>
  <line x1="18" y1="9" x2="18" y2="22" stroke="#000" stroke-width="0.9" opacity="0.5"/>
  <rect x="2" y="19" width="32" height="3" rx="1" fill="${p.armorShade}" ${OL}/>
</svg>`

  // tunic (default)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 22" width="36" height="22">
  <ellipse cx="18" cy="1" rx="5" ry="2.8" fill="${p.skin}" ${OLs}/>
  <path d="M0,4 Q0,0 5,0 L31,0 Q36,0 36,4 L34,22 L2,22 Z" fill="${p.armor}" ${OLb}/>
  <path d="M0,4 Q0,0 5,0 L9,0 L8,9 L0,11 Z" fill="${p.armorShade}" ${OLs}/>
  <path d="M36,4 Q36,0 31,0 L27,0 L28,9 L36,11 Z" fill="${p.armorShade}" ${OLs}/>
  <rect x="4" y="16" width="28" height="4" rx="1" fill="${p.armorShade}" ${OL}/>
  <rect x="15" y="14" width="6" height="6" rx="1" fill="${p.trim}" ${OLs}/>
  <line x1="18" y1="2" x2="18" y2="15" stroke="#000" stroke-width="0.9" opacity="0.55"/>
</svg>`
}

function headSvg(v: HeadVariant, p: EntityPalette): string {
  if (v === 'helm') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 20" width="24" height="20">
  <ellipse cx="12" cy="15" rx="7" ry="5" fill="${p.skin}" ${OLs}/>
  <path d="M4,12 Q4,1 12,1 Q20,1 20,12 Z" fill="${p.armor}" ${OLb}/>
  <rect x="3" y="10" width="18" height="3" rx="1" fill="${p.armorShade}" ${OL}/>
  <path d="M3,12 Q3,15 4,18 L7,18 Q6,15 5,12 Z" fill="${p.armorShade}" ${OL}/>
  <path d="M21,12 Q21,15 20,18 L17,18 Q18,15 19,12 Z" fill="${p.armorShade}" ${OL}/>
  <rect x="11" y="9" width="2" height="9" rx="1" fill="${p.armorShade}" ${OLs}/>
  <ellipse cx="9" cy="14" rx="2" ry="1.5" fill="#1a1008" ${OLs}/>
  <path d="M7,2 Q10,1 12,1 Q15,1 16,3 Q12,1.5 7,2 Z" fill="${p.trim}" opacity="0.5"/>
</svg>`

  if (v === 'face') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 20" width="24" height="20">
  <ellipse cx="12" cy="13" rx="8" ry="7" fill="${p.skin}" ${OL}/>
  <ellipse cx="12" cy="8" rx="8" ry="5" fill="${p.armorShade}" ${OL}/>
  <ellipse cx="12" cy="7" rx="6" ry="3.5" fill="${p.armorShade}" opacity="0.5"/>
  <ellipse cx="9.5" cy="13" rx="2" ry="1.5" fill="#1a1008" ${OLs}/>
  <line x1="7.5" y1="11.5" x2="11.5" y2="11" stroke="#000" stroke-width="1" opacity="0.7"/>
  <path d="M10,17 Q12,18.5 14,17" fill="none" stroke="#000" stroke-width="1" opacity="0.55"/>
</svg>`

  if (v === 'hat') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 20" width="24" height="20">
  <ellipse cx="12" cy="16" rx="7" ry="4" fill="${p.skin}" ${OLs}/>
  <ellipse cx="12" cy="11.5" rx="11" ry="2.4" fill="${p.armor}" ${OLb}/>
  <path d="M8,11.5 L12,1 L16,11.5 Z" fill="${p.armor}" ${OLb}/>
  <line x1="3" y1="11.5" x2="21" y2="11.5" stroke="#000" stroke-width="1" opacity="0.6"/>
  <ellipse cx="10" cy="15.5" rx="1.8" ry="1.4" fill="#1a1008" ${OLs}/>
</svg>`

  if (v === 'horned') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 20" width="24" height="20">
  <ellipse cx="12" cy="15" rx="7" ry="5" fill="${p.skin}" ${OLs}/>
  <path d="M5,8 Q2,3 1,0 Q4,1 6,4 Q7,6 7,9 Z" fill="#efe6d2" ${OL}/>
  <path d="M19,8 Q22,3 23,0 Q20,1 18,4 Q17,6 17,9 Z" fill="#efe6d2" ${OL}/>
  <path d="M4,11 Q4,2 12,2 Q20,2 20,11 Z" fill="${p.armor}" ${OLb}/>
  <rect x="3" y="9.5" width="18" height="3" rx="1" fill="${p.armorShade}" ${OL}/>
  <circle cx="12" cy="5" r="1.3" fill="${p.trim}" ${OLs}/>
  <ellipse cx="10" cy="14.5" rx="1.8" ry="1.4" fill="#1a1008" ${OLs}/>
</svg>`

  if (v === 'bascinet') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 20" width="24" height="20">
  <path d="M4,11 Q4,1 12,1 Q20,1 20,11 Q20,18 12,19 Q4,18 4,11 Z" fill="${p.armor}" ${OLb}/>
  <path d="M6,2 Q12,0 18,2 Q14,3 12,3 Q10,3 6,2 Z" fill="${p.trim}" opacity="0.45"/>
  <path d="M12,1 L12,19" stroke="#000" stroke-width="0.9" opacity="0.55"/>
  <path d="M5,9 L19,9" stroke="#000" stroke-width="1.4" opacity="0.85"/>
  <rect x="5" y="9.6" width="14" height="2.4" rx="1" fill="#0a0a0a"/>
  <line x1="8" y1="13.5" x2="8" y2="17.5" stroke="#000" stroke-width="1" opacity="0.7"/>
  <line x1="11" y1="14" x2="11" y2="18" stroke="#000" stroke-width="1" opacity="0.7"/>
  <line x1="14" y1="14" x2="14" y2="18" stroke="#000" stroke-width="1" opacity="0.7"/>
  <line x1="16.5" y1="13.5" x2="16.5" y2="17.5" stroke="#000" stroke-width="1" opacity="0.7"/>
</svg>`

  // hood (default)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 20" width="24" height="20">
  <ellipse cx="12" cy="14" rx="7" ry="6" fill="${p.skin}"/>
  <path d="M2,8 Q2,0 12,0 Q22,0 22,8 L23,20 L1,20 Z" fill="${p.armor}" ${OLb}/>
  <ellipse cx="12" cy="14" rx="6" ry="5" fill="${p.skin}" ${OLs}/>
  <ellipse cx="10" cy="13" rx="2" ry="1.5" fill="#1a1008" ${OLs}/>
  <line x1="12" y1="14" x2="12" y2="16.5" stroke="#000" stroke-width="0.9" opacity="0.4"/>
</svg>`
}

function legSvg(p: EntityPalette): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 18" width="10" height="18">
  <rect x="1" y="0" width="8" height="10" rx="3" fill="${p.armor}" ${OLb}/>
  <rect x="2" y="9" width="6" height="7" rx="2" fill="${p.armorShade}" ${OL}/>
  <path d="M2,15 L8,15 Q10,16 9,18 L2,18 Q1,17 2,15 Z" fill="${p.armorShade}" ${OL}/>
</svg>`
}

function armSvg(p: EntityPalette): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 16" width="10" height="16">
  <rect x="1" y="0" width="8" height="9" rx="3" fill="${p.armor}" ${OLb}/>
  <rect x="2" y="8" width="6" height="6" rx="2" fill="${p.skin}" ${OL}/>
</svg>`
}

function weaponSvg(w: Weapon): string {
  const el = w.element ? ELEMENT_COLOR[w.element] ?? '#ffffff' : '#ffffff'

  if (w.type === 'sword') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 38" width="10" height="38">
  <path d="M5,0 L7,2 L7,26 L5,28 L3,26 L3,2 Z" fill="#c4c8cc" ${OLb}/>
  <line x1="5" y1="2" x2="5" y2="25" stroke="#e8ecf0" stroke-width="0.9" opacity="0.8"/>
  <rect x="0" y="26" width="10" height="3" rx="1" fill="#808898" ${OL}/>
  <rect x="3" y="29" width="4" height="7" rx="1.5" fill="#6a4020" ${OL}/>
  <line x1="3.5" y1="31.5" x2="6.5" y2="31.5" stroke="#3a1f0c" stroke-width="1"/>
  <line x1="3.5" y1="33.5" x2="6.5" y2="33.5" stroke="#3a1f0c" stroke-width="1"/>
  <ellipse cx="5" cy="36" rx="3" ry="2" fill="#808898" ${OL}/>
</svg>`

  if (w.type === 'bow') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 36" width="16" height="36">
  <path d="M8,0 Q14,4 14,18 Q14,32 8,36" fill="none" stroke="#000" stroke-width="6" stroke-linecap="round"/>
  <path d="M8,0 Q14,4 14,18 Q14,32 8,36" fill="none" stroke="#8a5a20" stroke-width="3" stroke-linecap="round"/>
  <line x1="8" y1="0" x2="8" y2="36" stroke="#e0d090" stroke-width="1" opacity="0.85"/>
  <rect x="6" y="15" width="4" height="6" rx="1" fill="#6a4010" ${OL}/>
  <circle cx="8" cy="2" r="2.2" fill="#a07040" ${OL}/>
  <circle cx="8" cy="34" r="2.2" fill="#a07040" ${OL}/>
</svg>`

  if (w.type === 'hammer') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 38" width="18" height="38">
  <rect x="1" y="0" width="16" height="12" rx="2" fill="#909098" ${OLb}/>
  <rect x="1" y="0" width="16" height="3" rx="2" fill="#b8bcc4"/>
  <rect x="1" y="9" width="16" height="3" rx="1" fill="#78808a" ${OL}/>
  <rect x="7" y="12" width="4" height="22" rx="2" fill="#8a6030" ${OL}/>
  <line x1="6.5" y1="26" x2="11.5" y2="26" stroke="#5a3408" stroke-width="1.1"/>
  <line x1="6.5" y1="29" x2="11.5" y2="29" stroke="#5a3408" stroke-width="1.1"/>
  <ellipse cx="9" cy="35" rx="4" ry="3" fill="#909098" ${OL}/>
</svg>`

  if (w.type === 'staff') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 46" width="12" height="46">
  <rect x="4.5" y="12" width="3" height="34" rx="1.5" fill="#6a4820" ${OL}/>
  <rect x="3.5" y="18" width="5" height="2" rx="1" fill="#8a6840" ${OLs}/>
  <path d="M4,10 Q4,12 6,12 Q8,12 8,10 Z" fill="#706858" ${OL}/>
  <circle cx="6" cy="6" r="6" fill="${el}" opacity="0.28"/>
  <circle cx="6" cy="6" r="4.5" fill="${el}" ${OLb}/>
  <circle cx="4.5" cy="4.5" r="2" fill="white" opacity="0.45"/>
</svg>`

  if (w.type === 'wand') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 28" width="10" height="28">
  <rect x="4" y="10" width="2" height="18" rx="1" fill="#5a3820" ${OL}/>
  <rect x="3" y="21" width="4" height="3" rx="1" fill="#3a2010" ${OLs}/>
  <circle cx="5" cy="5" r="5" fill="${el}" opacity="0.28"/>
  <circle cx="5" cy="5" r="3.5" fill="${el}" ${OLb}/>
  <circle cx="3.8" cy="3.8" r="1.5" fill="white" opacity="0.48"/>
</svg>`

  // ── New action-specific weapon shapes ────────────────────────────────────────

  if (w.type === 'bomb') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 24" width="16" height="24">
  <path d="M8,5 Q11,2 14,4" fill="none" stroke="#2a1604" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="14.5" cy="3.5" r="2.6" fill="#ff9900" opacity="0.6"/>
  <circle cx="14.5" cy="3.5" r="1.5" fill="#ffee44"/>
  <circle cx="14.5" cy="3.5" r="0.7" fill="white" opacity="0.85"/>
  <circle cx="8" cy="15" r="8" fill="#1c1c1c" stroke="#000" stroke-width="1.5"/>
  <ellipse cx="5" cy="12" rx="2.8" ry="2" fill="white" opacity="0.12"/>
  <path d="M3,9 Q8,7 13,9" fill="none" stroke="#000" stroke-width="1.2" opacity="0.55"/>
</svg>`

  if (w.type === 'branch_staff') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 46" width="16" height="46">
  <path d="M7.5,14 Q6.5,25 7.5,34 Q8,40 7.5,46" fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
  <path d="M7.5,14 Q6.5,25 7.5,34 Q8,40 7.5,46" fill="none" stroke="#7a4518" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M7.5,12 Q3,7 1,2" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"/>
  <path d="M7.5,12 Q3,7 1,2" fill="none" stroke="#7a4518" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M1,2 Q0,0 2,0" fill="none" stroke="#7a4518" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M8,12 Q13,8 15,3" fill="none" stroke="#000" stroke-width="4.2" stroke-linecap="round"/>
  <path d="M8,12 Q13,8 15,3" fill="none" stroke="#7a4518" stroke-width="2" stroke-linecap="round"/>
  <path d="M15,3 Q16,1 15,0" fill="none" stroke="#7a4518" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M8,16 Q12,13 13,11" fill="none" stroke="#7a4518" stroke-width="1.4" stroke-linecap="round"/>
  <circle cx="7.5" cy="11" r="6" fill="#ff6a1f" opacity="0.18"/>
  <circle cx="7.5" cy="11" r="4" fill="#ff8030" stroke="#000" stroke-width="1.1"/>
  <circle cx="7.5" cy="11" r="2" fill="#ffd060" opacity="0.95"/>
  <rect x="5.5" y="29" width="4" height="1.5" rx="0.7" fill="#1c0a04"/>
  <rect x="5.5" y="32" width="4" height="1.5" rx="0.7" fill="#1c0a04"/>
</svg>`

  if (w.type === 'lightning_bolt') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 33" width="10" height="33">
  <rect x="3.5" y="16" width="3" height="17" rx="1.5" fill="#6a3a10" ${OL}/>
  <rect x="3" y="24" width="4" height="1.5" rx="0.7" fill="#2a1206"/>
  <rect x="3" y="27" width="4" height="1.5" rx="0.7" fill="#2a1206"/>
  <rect x="3" y="14" width="4" height="3" rx="1" fill="#4060a0" ${OL}/>
  <path d="M5,0 L9,8 L6,8 L9,14 L1,14 L4,8 L1,8 Z" fill="#46c8ff" stroke="#000" stroke-width="1.3" stroke-linejoin="round"/>
  <path d="M5.5,1.5 L8.5,8 L6.5,8 L8,13" fill="none" stroke="white" stroke-width="0.8" opacity="0.5"/>
</svg>`

  return '' // unreachable
}

// ── Weapon-for-action mapping ─────────────────────────────────────────────────

export function weaponForAction(action: ActionDef): Weapon {
  // Per-action overrides (before general tag checks)
  if (action.id === 'fireball') return { type: 'branch_staff' }
  if (action.id === 'bolt')     return { type: 'lightning_bolt' }
  if (action.id === 'grenade')  return { type: 'bomb' }

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
    for (const v of ['hood', 'helm', 'face', 'hat', 'horned', 'bascinet'] as HeadVariant[]) {
      tasks.push(loadSvgTex(`head_${v}_${tier}`, headSvg(v, p)))
    }
    tasks.push(loadSvgTex(`leg_${tier}`, legSvg(p)))
    tasks.push(loadSvgTex(`arm_${tier}`, armSvg(p)))
  }

  // Player color variants
  for (const colorKey of Object.keys(PLAYER_COLOR_PALETTES) as PlayerColorKey[]) {
    const p = PLAYER_COLOR_PALETTES[colorKey]
    for (const v of ['tunic', 'plate', 'robe'] as BodyVariant[]) {
      tasks.push(loadSvgTex(`body_${v}_pc_${colorKey}`, bodySvg(v, p)))
    }
    for (const v of ['hood', 'helm', 'face', 'hat', 'horned', 'bascinet'] as HeadVariant[]) {
      tasks.push(loadSvgTex(`head_${v}_pc_${colorKey}`, headSvg(v, p)))
    }
    tasks.push(loadSvgTex(`leg_pc_${colorKey}`, legSvg(p)))
    tasks.push(loadSvgTex(`arm_pc_${colorKey}`, armSvg(p)))
  }

  // Non-elemental weapons
  for (const type of ['sword', 'bow', 'hammer'] as const) {
    tasks.push(loadSvgTex(`weapon_${type}`, weaponSvg({ type })))
  }
  // Action-specific weapons with colors baked in (no element suffix)
  tasks.push(loadSvgTex('weapon_bomb',          weaponSvg({ type: 'bomb' })))
  tasks.push(loadSvgTex('weapon_branch_staff',  weaponSvg({ type: 'branch_staff' })))
  tasks.push(loadSvgTex('weapon_lightning_bolt', weaponSvg({ type: 'lightning_bolt' })))
  // Elemental staff/wand (orb color varies by element)
  for (const el of ['fire', 'lightning', 'cold'] as const) {
    tasks.push(loadSvgTex(`weapon_staff_${el}`, weaponSvg({ type: 'staff', element: el })))
    tasks.push(loadSvgTex(`weapon_wand_${el}`,  weaponSvg({ type: 'wand',  element: el })))
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

export function getPlayerBodyTex(v: BodyVariant, colorKey: PlayerColorKey): Texture {
  return texCache.get(`body_${v}_pc_${colorKey}`)!
}
export function getPlayerHeadTex(v: HeadVariant, colorKey: PlayerColorKey): Texture {
  return texCache.get(`head_${v}_pc_${colorKey}`)!
}
export function getPlayerLegTex(colorKey: PlayerColorKey): Texture {
  return texCache.get(`leg_pc_${colorKey}`)!
}
export function getPlayerArmTex(colorKey: PlayerColorKey): Texture {
  return texCache.get(`arm_pc_${colorKey}`)!
}

// ── Character preview SVG ─────────────────────────────────────────────────────

// Composite SVG for the customize modal preview.
// Positions match the rig layout (BASE_RADIUS=20) at scale 1.25, waist at (40,65).
function stripSvg(svg: string): string {
  return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
}

function embedPart(svg: string, origW: number, origH: number, tx: number, ty: number, dW: number, dH: number): string {
  const sx = dW / origW, sy = dH / origH
  return `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${sx.toFixed(4)},${sy.toFixed(4)})">${stripSvg(svg)}</g>`
}

export function renderCharacterPreviewSvg(headVariant: HeadVariant, colorKey: PlayerColorKey): string {
  const p = PLAYER_COLOR_PALETTES[colorKey]
  const S = 1.25   // rig scale for preview
  const CX = 40, CY = 65   // waist centre in SVG space

  // Positions mirror entity-rig.ts constants × S, offsets from (CX,CY)
  const bodyW = 30 * S, bodyH = 27 * S
  const headW = 24 * S, headH = 20 * S
  const legW  = 10 * S, legH  = 18 * S
  const armW  = 10 * S, armH  = 16 * S

  // back-to-front order
  const backLeg  = embedPart(legSvg(p),  10, 18, CX + (-5)*S - legW/2, CY + 0,       legW,  legH)
  const backArm  = embedPart(armSvg(p),  10, 16, CX + (-16)*S - armW/2, CY + (-26)*S, armW, armH)
  const body_    = embedPart(bodySvg('tunic', p), 36, 22, CX - bodyW/2, CY + (-11)*S - bodyH/2, bodyW, bodyH)
  const head_    = embedPart(headSvg(headVariant, p), 24, 20, CX + 2*S - headW/2, CY + (-26)*S - headH, headW, headH)
  const frontLeg = embedPart(legSvg(p),  10, 18, CX + 5*S - legW/2, CY + 0,          legW,  legH)
  const frontArm = embedPart(armSvg(p),  10, 16, CX + 16*S - armW/2, CY + (-26)*S,   armW,  armH)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" width="80" height="100">${backLeg}${backArm}${body_}${head_}${frontLeg}${frontArm}</svg>`
}
