import { Assets, type Texture } from 'pixi.js'

function loadSvg(svg: string): Promise<Texture> {
  return Assets.load<Texture>(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`)
}

// ── Floor tiles (solid background, 3 variants) ────────────────────────────────

// Four plain-grass variants — same palette, different patch layouts and stem
// orientations (lean-right / lean-left / vertical / sparse), each with only 1–2
// stems. Mixed at equal weight so plain grass stays dominant but never looks tiled.
const GRASS_PLAIN_A = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" fill="#5c9040"/>
  <ellipse cx="12" cy="46" rx="9" ry="6" fill="#4a7230" opacity="0.55"/>
  <ellipse cx="50" cy="16" rx="11" ry="7" fill="#4a7230" opacity="0.45"/>
  <ellipse cx="34" cy="56" rx="13" ry="5" fill="#4a7230" opacity="0.4"/>
  <ellipse cx="22" cy="20" rx="8" ry="5" fill="#70b050" opacity="0.5"/>
  <ellipse cx="52" cy="44" rx="10" ry="6" fill="#70b050" opacity="0.4"/>
  <line x1="18" y1="38" x2="21" y2="30" stroke="#82c255" stroke-width="1.3" stroke-linecap="round"/>
  <line x1="46" y1="42" x2="49" y2="34" stroke="#82c255" stroke-width="1.3" stroke-linecap="round"/>
</svg>`

const GRASS_PLAIN_B = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" fill="#5c9040"/>
  <ellipse cx="16" cy="18" rx="10" ry="6" fill="#4a7230" opacity="0.5"/>
  <ellipse cx="46" cy="48" rx="11" ry="7" fill="#4a7230" opacity="0.45"/>
  <ellipse cx="30" cy="38" rx="12" ry="5" fill="#4a7230" opacity="0.4"/>
  <ellipse cx="44" cy="18" rx="8" ry="5" fill="#70b050" opacity="0.5"/>
  <ellipse cx="14" cy="50" rx="9" ry="6" fill="#70b050" opacity="0.4"/>
  <line x1="26" y1="42" x2="23" y2="34" stroke="#82c255" stroke-width="1.3" stroke-linecap="round"/>
  <line x1="52" y1="30" x2="49" y2="23" stroke="#82c255" stroke-width="1.3" stroke-linecap="round"/>
</svg>`

const GRASS_PLAIN_C = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" fill="#5c9040"/>
  <ellipse cx="20" cy="40" rx="10" ry="6" fill="#4a7230" opacity="0.55"/>
  <ellipse cx="48" cy="24" rx="11" ry="7" fill="#4a7230" opacity="0.45"/>
  <ellipse cx="36" cy="54" rx="11" ry="5" fill="#70b050" opacity="0.4"/>
  <ellipse cx="14" cy="22" rx="7" ry="5" fill="#70b050" opacity="0.5"/>
  <line x1="34" y1="46" x2="34" y2="38" stroke="#82c255" stroke-width="1.3" stroke-linecap="round"/>
</svg>`

const GRASS_PLAIN_D = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" fill="#5c9040"/>
  <ellipse cx="10" cy="30" rx="9" ry="6" fill="#4a7230" opacity="0.5"/>
  <ellipse cx="52" cy="50" rx="10" ry="7" fill="#4a7230" opacity="0.45"/>
  <ellipse cx="30" cy="18" rx="12" ry="5" fill="#4a7230" opacity="0.4"/>
  <ellipse cx="24" cy="48" rx="8" ry="5" fill="#70b050" opacity="0.5"/>
  <ellipse cx="50" cy="30" rx="9" ry="6" fill="#70b050" opacity="0.4"/>
  <line x1="16" y1="54" x2="19" y2="46" stroke="#82c255" stroke-width="1.3" stroke-linecap="round"/>
</svg>`

const GRASS_PEBBLES = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" fill="#5c9040"/>
  <ellipse cx="10" cy="48" rx="9" ry="6" fill="#4a7230" opacity="0.55"/>
  <ellipse cx="48" cy="18" rx="11" ry="7" fill="#4a7230" opacity="0.45"/>
  <ellipse cx="22" cy="22" rx="8" ry="5" fill="#70b050" opacity="0.5"/>
  <line x1="42" y1="38" x2="44" y2="32" stroke="#82c255" stroke-width="1.3" stroke-linecap="round"/>
  <ellipse cx="26" cy="38" rx="4" ry="3" fill="#8a8070"/>
  <ellipse cx="24" cy="37" rx="2" ry="1.5" fill="#b0a898" opacity="0.6"/>
  <ellipse cx="44" cy="18" rx="3" ry="2.2" fill="#7a7468"/>
  <ellipse cx="43" cy="17" rx="1.5" ry="1" fill="#a89e90" opacity="0.6"/>
  <ellipse cx="14" cy="30" rx="3.5" ry="2.5" fill="#8a8070"/>
  <ellipse cx="13" cy="29" rx="1.8" ry="1.2" fill="#b0a898" opacity="0.6"/>
  <ellipse cx="50" cy="50" rx="4" ry="2.8" fill="#7a7468"/>
  <ellipse cx="49" cy="49" rx="2" ry="1.3" fill="#a89e90" opacity="0.6"/>
  <ellipse cx="36" cy="56" rx="3" ry="2" fill="#8a8070"/>
</svg>`

const GRASS_FLOWERS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" fill="#5c9040"/>
  <ellipse cx="14" cy="44" rx="9" ry="6" fill="#4a7230" opacity="0.55"/>
  <ellipse cx="50" cy="20" rx="11" ry="7" fill="#4a7230" opacity="0.45"/>
  <ellipse cx="24" cy="24" rx="8" ry="5" fill="#70b050" opacity="0.5"/>
  <line x1="8" y1="20" x2="10" y2="13" stroke="#82c255" stroke-width="1.3" stroke-linecap="round"/>
  <line x1="56" y1="50" x2="58" y2="44" stroke="#82c255" stroke-width="1.3" stroke-linecap="round"/>
  <circle cx="20" cy="40" r="1.8" fill="#f8f0d0"/>
  <circle cx="23.5" cy="41.5" r="1.8" fill="#f8f0d0"/>
  <circle cx="23.5" cy="46.5" r="1.8" fill="#f8f0d0"/>
  <circle cx="20" cy="48" r="1.8" fill="#f8f0d0"/>
  <circle cx="16.5" cy="46.5" r="1.8" fill="#f8f0d0"/>
  <circle cx="16.5" cy="41.5" r="1.8" fill="#f8f0d0"/>
  <circle cx="20" cy="44" r="2.5" fill="#f0c030"/>
  <circle cx="46" cy="27" r="1.5" fill="#c8a0e8"/>
  <circle cx="48.6" cy="28.5" r="1.5" fill="#c8a0e8"/>
  <circle cx="48.6" cy="31.5" r="1.5" fill="#c8a0e8"/>
  <circle cx="46" cy="33" r="1.5" fill="#c8a0e8"/>
  <circle cx="43.4" cy="31.5" r="1.5" fill="#c8a0e8"/>
  <circle cx="43.4" cy="28.5" r="1.5" fill="#c8a0e8"/>
  <circle cx="46" cy="30" r="2" fill="#9060c0"/>
  <circle cx="31.5" cy="52.5" r="1.5" fill="#f0f0e8"/>
  <circle cx="36.5" cy="52.5" r="1.5" fill="#f0f0e8"/>
  <circle cx="34" cy="57" r="1.5" fill="#f0f0e8"/>
  <circle cx="34" cy="54" r="2" fill="#f8e050"/>
</svg>`

// ── Tree canopy tiles (transparent background, layered over grass floor) ──────

const TREE_OAK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect x="28" y="46" width="8" height="18" rx="2" fill="#5c3d1e"/>
  <rect x="30" y="46" width="3" height="18" fill="#7a5228" opacity="0.45"/>
  <ellipse cx="32" cy="63" rx="12" ry="3" fill="#1a0e04" opacity="0.35"/>
  <circle cx="32" cy="30" r="22" fill="#1e4d14" opacity="0.55"/>
  <circle cx="22" cy="22" r="10" fill="#2d8a1e"/>
  <circle cx="44" cy="24" r="11" fill="#257018"/>
  <circle cx="32" cy="18" r="12" fill="#308a1e"/>
  <circle cx="18" cy="32" r="9" fill="#267018"/>
  <circle cx="46" cy="34" r="9" fill="#207018"/>
  <circle cx="32" cy="28" r="20" fill="#2a7818"/>
  <circle cx="14" cy="28" r="6" fill="#267018"/>
  <circle cx="50" cy="26" r="6" fill="#207018"/>
  <circle cx="16" cy="40" r="5" fill="#247018"/>
  <circle cx="48" cy="40" r="5" fill="#1e6a14"/>
  <circle cx="24" cy="18" r="7" fill="#48a828" opacity="0.7"/>
  <circle cx="36" cy="14" r="6" fill="#55b830" opacity="0.6"/>
  <circle cx="20" cy="24" r="5" fill="#50b030" opacity="0.55"/>
</svg>`

const TREE_PINE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect x="29" y="52" width="6" height="12" rx="1.5" fill="#4a3010"/>
  <rect x="30.5" y="52" width="2.5" height="12" fill="#6a4820" opacity="0.45"/>
  <ellipse cx="32" cy="63" rx="10" ry="2.5" fill="#1a0e04" opacity="0.3"/>
  <polygon points="32,50 10,64 54,64" fill="#1a5210"/>
  <polygon points="32,50 12,62 52,62" fill="#22681a"/>
  <polygon points="32,36 12,54 52,54" fill="#1f7016"/>
  <polygon points="32,36 14,52 50,52" fill="#27801e"/>
  <polygon points="32,20 16,42 48,42" fill="#237a1a"/>
  <polygon points="32,20 18,40 46,40" fill="#2e8e22"/>
  <polygon points="32,8 20,28 44,28" fill="#289020"/>
  <polygon points="32,8 22,26 42,26" fill="#33a028"/>
  <polygon points="32,8 22,26 30,16" fill="#44c030" opacity="0.55"/>
</svg>`

const TREE_MIXED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect x="27" y="48" width="7" height="16" rx="2" fill="#5c3d1e"/>
  <rect x="29" y="48" width="2.5" height="16" fill="#7a5228" opacity="0.45"/>
  <ellipse cx="32" cy="62" rx="11" ry="2.8" fill="#1a0e04" opacity="0.35"/>
  <ellipse cx="32" cy="32" rx="22" ry="20" fill="#1a4010" opacity="0.45"/>
  <circle cx="28" cy="26" r="18" fill="#267018"/>
  <circle cx="40" cy="30" r="15" fill="#1e5e12"/>
  <circle cx="24" cy="36" r="13" fill="#237018"/>
  <circle cx="20" cy="26" r="12" fill="#267820"/>
  <circle cx="42" cy="20" r="11" fill="#228020"/>
  <circle cx="36" cy="14" r="9" fill="#278a1e"/>
  <circle cx="16" cy="34" r="8" fill="#1e6010"/>
  <circle cx="48" cy="36" r="8" fill="#1a5c10"/>
  <circle cx="22" cy="18" r="8" fill="#48a828" opacity="0.6"/>
  <circle cx="36" cy="12" r="6" fill="#3a9820" opacity="0.55"/>
  <circle cx="48" cy="22" r="5" fill="#36901e" opacity="0.5"/>
</svg>`

// ── Decoration tiles (transparent background, 1-2 tile groups) ───────────────

const DECO_ROCKS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <ellipse cx="30" cy="54" rx="18" ry="5" fill="#1a2808" opacity="0.3"/>
  <ellipse cx="26" cy="38" rx="16" ry="14" fill="#5c5c58"/>
  <ellipse cx="26" cy="36" rx="16" ry="14" fill="#787874"/>
  <ellipse cx="21" cy="31" rx="8" ry="6" fill="#929290" opacity="0.65"/>
  <ellipse cx="18" cy="44" rx="5" ry="3" fill="#4a6e30" opacity="0.85"/>
  <ellipse cx="30" cy="50" rx="6" ry="3" fill="#3a5c25" opacity="0.75"/>
  <ellipse cx="46" cy="46" rx="9" ry="8" fill="#686864"/>
  <ellipse cx="46" cy="44" rx="9" ry="8" fill="#7a7a76"/>
  <ellipse cx="43" cy="41" rx="4" ry="3" fill="#9a9a96" opacity="0.6"/>
  <ellipse cx="50" cy="50" rx="4" ry="2.5" fill="#3a5820" opacity="0.75"/>
  <ellipse cx="38" cy="54" rx="5" ry="3.5" fill="#6a6a66"/>
  <ellipse cx="37" cy="53" rx="2.5" ry="1.8" fill="#9a9a96" opacity="0.55"/>
</svg>`

const DECO_POND = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <ellipse cx="32" cy="38" rx="26" ry="20" fill="#2a4a10" opacity="0.35"/>
  <ellipse cx="32" cy="38" rx="22" ry="16" fill="#2a6a9a"/>
  <ellipse cx="32" cy="38" rx="22" ry="16" fill="#3a7ab5"/>
  <ellipse cx="26" cy="34" rx="8" ry="4" fill="#5a9ad5" opacity="0.6"/>
  <ellipse cx="38" cy="42" rx="5" ry="2.5" fill="#4a8ac5" opacity="0.4"/>
  <line x1="18" y1="38" x2="46" y2="38" stroke="#6aaae0" stroke-width="1" opacity="0.35"/>
  <line x1="20" y1="42" x2="44" y2="42" stroke="#6aaae0" stroke-width="0.8" opacity="0.25"/>
  <circle cx="20" cy="36" r="5" fill="#3a7030"/>
  <path d="M20,36 L15,32 A5,5 0 0,1 25,32 Z" fill="#2a5825" opacity="0.7"/>
  <circle cx="44" cy="42" r="4" fill="#3a7030"/>
  <path d="M44,42 L40,38 A4,4 0 0,1 48,38 Z" fill="#2a5825" opacity="0.7"/>
  <circle cx="20" cy="36" r="2" fill="#f8f0d0"/>
  <circle cx="20" cy="36" r="1.2" fill="#f0c030"/>
  <line x1="10" y1="28" x2="12" y2="22" stroke="#5a9030" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="14" y1="24" x2="16" y2="18" stroke="#5a9030" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="52" y1="26" x2="54" y2="20" stroke="#5a9030" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="56" y1="32" x2="58" y2="26" stroke="#5a9030" stroke-width="1.5" stroke-linecap="round"/>
</svg>`

const DECO_THORNS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <ellipse cx="32" cy="60" rx="16" ry="4" fill="#1a0a04" opacity="0.28"/>
  <path d="M32,58 C28,50 18,44 14,34 C12,28 16,22 20,20" stroke="#4a3010" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M32,58 C36,48 46,42 50,32 C52,26 48,20 44,18" stroke="#4a3010" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M32,58 C32,46 28,36 24,28 C22,22 26,14 30,10" stroke="#3a2808" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M32,58 C34,44 38,32 42,24 C44,18 40,10 36,8" stroke="#3a2808" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M20,34 L14,28" stroke="#5a3818" stroke-width="2" stroke-linecap="round"/>
  <path d="M24,42 L18,38" stroke="#5a3818" stroke-width="2" stroke-linecap="round"/>
  <path d="M44,30 L50,24" stroke="#5a3818" stroke-width="2" stroke-linecap="round"/>
  <path d="M42,44 L48,40" stroke="#5a3818" stroke-width="2" stroke-linecap="round"/>
  <path d="M28,32 L22,26" stroke="#5a3818" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M38,28 L44,22" stroke="#5a3818" stroke-width="1.5" stroke-linecap="round"/>
  <ellipse cx="18" cy="26" rx="5" ry="3" fill="#2d5a1a" transform="rotate(-30 18 26)"/>
  <ellipse cx="46" cy="24" rx="5" ry="3" fill="#2d5a1a" transform="rotate(30 46 24)"/>
  <ellipse cx="24" cy="18" rx="4" ry="2.5" fill="#357020" transform="rotate(-20 24 18)"/>
  <ellipse cx="40" cy="16" rx="4" ry="2.5" fill="#357020" transform="rotate(20 40 16)"/>
  <ellipse cx="32" cy="20" rx="5" ry="3" fill="#2d5a1a" transform="rotate(-10 32 20)"/>
  <circle cx="16" cy="30" r="3" fill="#8b1c1c"/>
  <circle cx="16" cy="30" r="1.5" fill="#b02828" opacity="0.55"/>
  <circle cx="48" cy="28" r="2.5" fill="#8b1c1c"/>
  <circle cx="48" cy="28" r="1.2" fill="#b02828" opacity="0.55"/>
  <circle cx="22" cy="16" r="2.5" fill="#8b1c1c"/>
  <circle cx="42" cy="14" r="2" fill="#8b1c1c"/>
  <circle cx="30" cy="12" r="2" fill="#721818"/>
</svg>`

const DECO_CARRIAGE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <ellipse cx="32" cy="60" rx="22" ry="5" fill="#1a1008" opacity="0.32"/>
  <circle cx="14" cy="52" r="10" fill="none" stroke="#5c3a10" stroke-width="3"/>
  <circle cx="14" cy="52" r="3" fill="#6a4218" stroke="#4a3010" stroke-width="1.5"/>
  <line x1="14" y1="42" x2="14" y2="62" stroke="#5c3a10" stroke-width="2.5"/>
  <line x1="4" y1="52" x2="24" y2="52" stroke="#5c3a10" stroke-width="2.5"/>
  <line x1="7" y1="45" x2="21" y2="59" stroke="#5c3a10" stroke-width="2"/>
  <line x1="7" y1="59" x2="14" y2="52" stroke="#5c3a10" stroke-width="2"/>
  <circle cx="14" cy="52" r="10" fill="none" stroke="#6b4818" stroke-width="0.8" opacity="0.4"/>
  <rect x="18" y="30" width="34" height="24" rx="3" fill="#7a5818"/>
  <rect x="18" y="30" width="34" height="24" rx="3" fill="#8a6520" opacity="0.5"/>
  <line x1="18" y1="36" x2="52" y2="36" stroke="#5a3e10" stroke-width="1.2" opacity="0.7"/>
  <line x1="18" y1="42" x2="52" y2="42" stroke="#5a3e10" stroke-width="1.2" opacity="0.7"/>
  <line x1="18" y1="48" x2="52" y2="48" stroke="#5a3e10" stroke-width="1.2" opacity="0.7"/>
  <path d="M30,30 L26,22 L28,20 L34,30" fill="#6a4e14" stroke="#4a3010" stroke-width="1"/>
  <rect x="18" y="28" width="34" height="4" rx="2" fill="#5a5a5a"/>
  <rect x="48" y="30" width="6" height="22" rx="2" fill="#505050"/>
  <rect x="18" y="30" width="6" height="22" rx="2" fill="#505050"/>
  <ellipse cx="36" cy="54" rx="10" ry="3" fill="#3a6020" opacity="0.6"/>
  <ellipse cx="22" cy="52" rx="5" ry="2" fill="#3a6020" opacity="0.5"/>
  <path d="M52,52 A10,10 0 0,0 52,42" stroke="#5c3a10" stroke-width="3" fill="none"/>
  <path d="M52,42 A10,10 0 0,0 62,52" stroke="#5c3a10" stroke-width="3" fill="none"/>
</svg>`

export async function loadTileTextures(): Promise<{
  floorOptions: { tex: Texture; w: number }[]
  treeOptions:  { tex: Texture; w: number }[]
  decoOptions:  { tex: Texture; w: number }[]
}> {
  const [
    grassPlainA, grassPlainB, grassPlainC, grassPlainD, grassPebbles, grassFlowers,
    treeOak, treePine, treeMixed,
    decoRocks, decoPond, decoThorns, decoCarriage,
  ] = await Promise.all([
    loadSvg(GRASS_PLAIN_A), loadSvg(GRASS_PLAIN_B), loadSvg(GRASS_PLAIN_C), loadSvg(GRASS_PLAIN_D),
    loadSvg(GRASS_PEBBLES), loadSvg(GRASS_FLOWERS),
    loadSvg(TREE_OAK), loadSvg(TREE_PINE), loadSvg(TREE_MIXED),
    loadSvg(DECO_ROCKS), loadSvg(DECO_POND), loadSvg(DECO_THORNS), loadSvg(DECO_CARRIAGE),
  ])

  return {
    floorOptions: [
      // Four plain variants share the original plain weight (100) → same overall
      // probability of "plain" grass, but visually varied.
      { tex: grassPlainA,  w: 25  },
      { tex: grassPlainB,  w: 25  },
      { tex: grassPlainC,  w: 25  },
      { tex: grassPlainD,  w: 25  },
      { tex: grassPebbles, w: 25  },
      { tex: grassFlowers, w: 15  },
    ],
    treeOptions: [
      { tex: treeOak,   w: 100 },
      { tex: treePine,  w: 60  },
      { tex: treeMixed, w: 40  },
    ],
    decoOptions: [
      { tex: decoRocks,    w: 100 },
      { tex: decoPond,     w: 80  },
      { tex: decoThorns,   w: 70  },
      { tex: decoCarriage, w: 20  },
    ],
  }
}
