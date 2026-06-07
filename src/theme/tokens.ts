export const tokens = {
  color: {
    primary: '#c8922a',
    primaryHover: '#dea83c',
    primaryActive: '#a87420',
    surface: '#120e0a',
    surfaceElevated: '#1c1510',
    surfacePanel: '#251a0c',
    border: 'rgba(200, 146, 42, 0.28)',
    text: '#f0e8d0',
    textMuted: '#9a8a6a',
    accent: '#e84545',
    accentAlt: '#5a9fd4',
  },
  // Progress/stat bar colours, sampled from the composed_bars sprites. Painted
  // as a gradient *behind* the 9-slice sprite (background-clip: padding-box) so
  // it only shows through the sub-pixel seam the stretched centre used to leave
  // before each rounded cap — the sprite itself still renders on top.
  bar: {
    xp: '#ffcc00',     xpEdge: '#ffd948',
    life: '#e86a17',   lifeEdge: '#fa8132',
    mana: '#1ea7e1',   manaEdge: '#35baf3',
    ascent: '#73cd4b', ascentEdge: '#88e060',
  },
  // Button face colours, sampled from the Kenney button sprites. Same trick:
  // a matching gradient sits behind the border-image to fill the seam that
  // showed a white sliver around the button content.
  button: {
    face: '#838796', faceTop: '#969aa8', faceBottom: '#767a89',
    beige: '#d3bf8f', beigeTop: '#e3d0a0', beigeBottom: '#c1ae7d',
  },
  font: {
    display: "'Cinzel', 'Georgia', serif",
    body: "'Crimson Pro', 'Georgia', serif",
    mono: "'Fira Code', 'Cascadia Code', monospace",
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    xxxl: '64px',
  },
  radius: {
    sm: '5px',
    md: '10px',
    lg: '20px',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 4px rgba(0, 0, 0, 0.5)',
    md: '0 4px 16px rgba(0, 0, 0, 0.6)',
    lg: '0 8px 40px rgba(0, 0, 0, 0.7)',
    glow: '0 0 24px rgba(200, 146, 42, 0.4)',
    accentGlow: '0 0 24px rgba(232, 69, 69, 0.4)',
  },
  transition: {
    fast: '120ms ease',
    normal: '220ms ease',
    slow: '380ms ease',
  },
} as const

export type Tokens = typeof tokens
