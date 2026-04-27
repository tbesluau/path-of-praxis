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
