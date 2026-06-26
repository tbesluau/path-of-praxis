// Custom inline weapon SVGs for the rot skills.
//
// Unlike the rest of the action icons (monochrome Lucide line-icons drawn via
// `<i data-lucide>`), these are bespoke, multi-colour weapon glyphs rendered
// inline so they keep their own greens/wood tones instead of the white
// currentColor treatment. They use a 24×24 viewBox to line up with Lucide.
//
// Stroked shapes set their own `stroke-width` so the stylesheet's
// `.action-thumb-icon svg { stroke-width: 1.5 }` (which only lands on shapes
// that don't declare one) can't thin them out.

export type WeaponIconId = 'twisted-staff' | 'green-bow' | 'rotten-dagger'

// A gnarled wooden staff crowned with a glowing poison orb — Putrid Nova.
const twistedStaff = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M9 22 C 11.5 18, 8.5 15, 11 11.5 C 13 8.7, 10.8 7.5, 12 6"
        stroke="#8a6a3a" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M9 22 C 11.5 18, 8.5 15, 11 11.5 C 13 8.7, 10.8 7.5, 12 6"
        stroke="#5e4424" stroke-width="0.8" stroke-linecap="round" opacity="0.55"/>
  <path d="M10.4 14 l2.1 -1.1" stroke="#5e4424" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M10.2 17.6 l-1.9 -0.6" stroke="#5e4424" stroke-width="1.1" stroke-linecap="round"/>
  <circle cx="12" cy="5" r="3.1" fill="#5fbf36"/>
  <circle cx="12" cy="5" r="3.1" fill="none" stroke="#2f7d18" stroke-width="0.9"/>
  <circle cx="10.9" cy="3.9" r="0.95" fill="#c7f49a"/>
</svg>`

// A recurve bow with a nocked, green-tipped arrow — Poisonous Arrow.
const greenBow = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M7 3 C 13.5 7, 13.5 17, 7 21"
        stroke="#3a9d3a" stroke-width="2.3" stroke-linecap="round"/>
  <path d="M7 3 C 9.5 4.5, 9.5 19.5, 7 21"
        stroke="#7fce5a" stroke-width="0.8" stroke-linecap="round" opacity="0.7"/>
  <path d="M7 3 L 7 21" stroke="#d7ecbb" stroke-width="1" stroke-linecap="round"/>
  <path d="M5 12 L 18.5 12" stroke="#7a5a2a" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M19 12 l-3.4 -2.1 v4.2 z" fill="#5fbf36" stroke="#2f7d18" stroke-width="0.6" stroke-linejoin="round"/>
  <path d="M5 12 l2.4 -1.7 M5 12 l2.4 1.7" stroke="#3a9d3a" stroke-width="1.3" stroke-linecap="round"/>
</svg>`

// A corroded, sickly-green dagger — Rotten Dagger.
const rottenDagger = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M12 2 L 14.3 9 L 12 11.4 L 9.7 9 Z"
        fill="#9cc06a" stroke="#4f7a2c" stroke-width="0.9" stroke-linejoin="round"/>
  <path d="M12 3.2 L 12 10.4" stroke="#4f7a2c" stroke-width="0.7" stroke-linecap="round"/>
  <path d="M12.8 5 q -0.9 1.4 0 2.8" stroke="#6f9a3f" stroke-width="0.6" stroke-linecap="round" opacity="0.8"/>
  <path d="M7.8 12 L 16.2 12" stroke="#6b4f2a" stroke-width="2" stroke-linecap="round"/>
  <path d="M12 12 L 12 19" stroke="#6b4f2a" stroke-width="2.3" stroke-linecap="round"/>
  <circle cx="12" cy="20.4" r="1.6" fill="#8a6a3a" stroke="#5e4424" stroke-width="0.7"/>
</svg>`

export const WEAPON_ICONS: Record<WeaponIconId, string> = {
  'twisted-staff': twistedStaff,
  'green-bow': greenBow,
  'rotten-dagger': rottenDagger,
}

export function isWeaponIcon(name: string): name is WeaponIconId {
  return name in WEAPON_ICONS
}
