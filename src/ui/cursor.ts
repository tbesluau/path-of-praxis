// Custom "arcane" mouse cursor + ember trail.
//
// Mouse-only: a no-op on touch / native so phones keep their native behaviour.
// The cursor art is built here as inline-SVG data URIs and exposed to CSS via
// the `--cursor-default` / `--cursor-charged` custom properties; main.css scopes
// everything under the `custom-cursor` body class this module adds. A light
// ember trail follows the pointer (with a small burst on click), disabled under
// prefers-reduced-motion.

import { isNativeApp } from '../core/context'

// Tip sits at (4,4) in the 32×32 art → that's the hotspot.
const HOTSPOT = '4 4'

// Standard arrow silhouette, dressed up: gold blade, dark outline, a soft
// highlight, and a small arcane gem at the base.
function arrowSvg(opts: { fill: string; gem: string; gemCore: string; glow?: boolean }): string {
  const halo = opts.glow
    ? `<circle cx="9" cy="12" r="12" fill="url(#g)"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <defs><radialGradient id="g" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#ffd874" stop-opacity="0.55"/>
    <stop offset="100%" stop-color="#ffd874" stop-opacity="0"/>
  </radialGradient></defs>
  ${halo}
  <path d="M4 4 L4 22 L9 17.6 L12.6 25 L16 23.4 L12.4 16 L19 16 Z"
        fill="${opts.fill}" stroke="#5a3d10" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M6 7.5 L6 17 L8.6 14.7" fill="none" stroke="#f0e8d0" stroke-width="1" stroke-linecap="round" opacity="0.55"/>
  <circle cx="6.4" cy="20" r="1.8" fill="${opts.gem}" stroke="#1e3f55" stroke-width="0.7"/>
  <circle cx="5.8" cy="19.4" r="0.7" fill="${opts.gemCore}"/>
</svg>`
}

function cursorValue(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${HOTSPOT}`
}

// ── Ember trail ────────────────────────────────────────────────────────────
const TRAIL_THROTTLE_MS = 38
const MAX_SPARKS = 64

let layer: HTMLDivElement | null = null
let lastSpawn = 0
let sparkCount = 0

function spawnSpark(x: number, y: number, bias?: { dx: number; dy: number; size: number }): void {
  if (!layer || sparkCount >= MAX_SPARKS) return
  const size = bias?.size ?? 5 + Math.random() * 4
  const dx = (bias?.dx ?? 0) + (Math.random() * 2 - 1) * 10
  const dy = (bias?.dy ?? -14) - Math.random() * 10
  const s = document.createElement('div')
  s.className = 'cursor-spark'
  s.style.left = `${x}px`
  s.style.top = `${y}px`
  s.style.width = `${size}px`
  s.style.height = `${size}px`
  s.style.setProperty('--dx', `${dx}px`)
  s.style.setProperty('--dy', `${dy}px`)
  s.addEventListener('animationend', () => { s.remove(); sparkCount-- }, { once: true })
  layer.appendChild(s)
  sparkCount++
}

function burst(x: number, y: number): void {
  const n = 6
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.5
    const r = 18 + Math.random() * 10
    spawnSpark(x, y, { dx: Math.cos(a) * r, dy: Math.sin(a) * r, size: 6 + Math.random() * 3 })
  }
}

/** Install the custom cursor. No-op unless a fine pointer (mouse) is present. */
export function initCursor(): void {
  const hasMouse = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
  if (!hasMouse || isNativeApp()) return

  const body = document.body
  body.style.setProperty('--cursor-default', cursorValue(arrowSvg({ fill: '#c8922a', gem: '#5a9fd4', gemCore: '#dff0ff' })))
  body.style.setProperty('--cursor-charged', cursorValue(arrowSvg({ fill: '#dea83c', gem: '#7fd0ff', gemCore: '#ffffff', glow: true })))
  body.classList.add('custom-cursor')

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduced) return  // keep the static cursor; skip the motion trail

  layer = document.createElement('div')
  layer.className = 'cursor-trail-layer'
  layer.setAttribute('aria-hidden', 'true')
  body.appendChild(layer)

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return
    if (e.timeStamp - lastSpawn < TRAIL_THROTTLE_MS) return
    lastSpawn = e.timeStamp
    spawnSpark(e.clientX, e.clientY)
  }, { passive: true })

  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return
    burst(e.clientX, e.clientY)
  }, { passive: true })
}
