export const gameIcons: Record<string, string> = {
  // Diagonal broadsword (blade, crossguard, handle, pommel)
  'gi-sword': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><g transform="translate(256,256) rotate(-45) translate(-256,-256)"><polygon points="248,44 264,44 272,292 256,336 240,292"/><rect x="168" y="290" width="176" height="44" rx="12"/><rect x="238" y="334" width="36" height="92" rx="10"/><ellipse cx="256" cy="440" rx="36" ry="28"/></g></svg>`,

  // Bow (arc body) with nocked arrow
  'gi-bow': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M176,60 C400,90 400,422 176,452" fill="none" stroke="currentColor" stroke-width="52" stroke-linecap="round"/><rect x="164" y="60" width="24" height="392" rx="10" fill="currentColor"/><rect x="60" y="244" width="360" height="24" rx="10" fill="currentColor"/><polygon points="376,208 462,256 376,304" fill="currentColor"/><rect x="52" y="232" width="28" height="48" rx="6" fill="currentColor"/></svg>`,

  // Flame / fireball
  'gi-fireball': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><path d="M256,36 C324,84 388,152 400,236 C412,320 372,396 288,436 C304,404 308,360 288,332 C280,356 260,376 248,396 C216,364 204,312 220,272 C196,296 184,340 192,380 C156,348 140,296 152,252 C128,280 120,328 132,368 C88,320 80,252 108,196 C84,212 68,244 64,280 C44,216 56,144 104,96 C88,132 92,176 116,204 C128,148 176,96 256,36 Z"/></svg>`,

  // Lightning bolt
  'gi-zap': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><polygon points="300,24 168,284 264,284 212,488 376,216 272,216"/></svg>`,

  // Targeting crosshair — ring with four extending bars and a centre dot
  'gi-crosshair': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><path fill-rule="evenodd" d="M256,56 A200,200 0 0 1 256,456 A200,200 0 0 1 256,56 Z M256,144 A112,112 0 0 1 256,368 A112,112 0 0 1 256,144 Z"/><rect x="228" y="8" width="56" height="92" rx="24"/><rect x="228" y="412" width="56" height="92" rx="24"/><rect x="8" y="228" width="92" height="56" rx="24"/><rect x="412" y="228" width="92" height="56" rx="24"/><circle cx="256" cy="256" r="32"/></svg>`,

  // Skull with eye sockets
  'gi-skull': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><path fill-rule="evenodd" d="M256,52 C132,52 48,144 48,256 C48,344 104,420 188,452 L188,476 C188,488 196,496 208,496 L304,496 C316,496 324,488 324,476 L324,452 C408,420 464,344 464,256 C464,144 380,52 256,52 Z M115,240 A70,70 0 0 1 255,240 A70,70 0 0 1 115,240 Z M257,240 A70,70 0 0 1 397,240 A70,70 0 0 1 257,240 Z"/><rect x="196" y="450" width="32" height="46" rx="8"/><rect x="240" y="450" width="32" height="46" rx="8"/><rect x="284" y="450" width="32" height="46" rx="8"/></svg>`,

  // Heart with downward arrow cutout (weakest / low HP targeting)
  'gi-health-decrease': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><path fill-rule="evenodd" d="M256,440 L84,268 C40,208 72,108 168,92 C212,84 248,104 256,120 C264,104 300,84 344,92 C440,108 472,208 428,268 Z M256,360 L214,268 L242,268 L242,192 L270,192 L270,268 L298,268 Z"/></svg>`,

  // Heart with upward arrow cutout (strongest / high HP targeting)
  'gi-health-increase': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><path fill-rule="evenodd" d="M256,440 L84,268 C40,208 72,108 168,92 C212,84 248,104 256,120 C264,104 300,84 344,92 C440,108 472,208 428,268 Z M256,192 L298,284 L270,284 L270,360 L242,360 L242,284 L214,284 Z"/></svg>`,

  // Six-sided die face (random targeting)
  'gi-dice': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><path fill-rule="evenodd" d="M120,80 L392,80 C416,80 432,96 432,120 L432,392 C432,416 416,432 392,432 L120,432 C96,432 80,416 80,392 L80,120 C80,96 96,80 120,80 Z M140,180 A36,36 0 0 1 212,180 A36,36 0 0 1 140,180 Z M300,180 A36,36 0 0 1 372,180 A36,36 0 0 1 300,180 Z M140,256 A36,36 0 0 1 212,256 A36,36 0 0 1 140,256 Z M300,256 A36,36 0 0 1 372,256 A36,36 0 0 1 300,256 Z M140,332 A36,36 0 0 1 212,332 A36,36 0 0 1 140,332 Z M300,332 A36,36 0 0 1 372,332 A36,36 0 0 1 300,332 Z"/></svg>`,
}

export type GameIconName = keyof typeof gameIcons

/**
 * Replace every <i data-game-icon="NAME"> inside root with its inline SVG.
 * Mirrors the Lucide createIcons() call pattern used elsewhere.
 */
export function renderGameIcons(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('i[data-game-icon]').forEach(el => {
    const name = el.dataset.gameIcon
    if (!name) return
    const svg = gameIcons[name]
    if (!svg) return
    const tmp = document.createElement('span')
    tmp.innerHTML = svg
    const svgEl = tmp.firstElementChild as SVGElement | null
    if (!svgEl) return
    svgEl.setAttribute('aria-hidden', 'true')
    if (el.className) svgEl.setAttribute('class', el.className)
    el.replaceWith(svgEl)
  })
}
