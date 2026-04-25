export const tokens = {
  color: {
    primary: '#8b7cf8',
    primaryHover: '#a599f9',
    primaryActive: '#6d5ef5',
    surface: '#0d0d1a',
    surfaceElevated: '#12122b',
    surfacePanel: '#1a1a35',
    border: 'rgba(139, 124, 248, 0.25)',
    text: '#e8e6f0',
    textMuted: '#7a7a9a',
    accent: '#f0a500',
    accentAlt: '#e94560',
  },
  font: {
    display: "'Cinzel', 'Georgia', serif",
    body: "'Inter', 'Segoe UI', system-ui, sans-serif",
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
    sm: '4px',
    md: '8px',
    lg: '16px',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 4px rgba(0, 0, 0, 0.4)',
    md: '0 4px 16px rgba(0, 0, 0, 0.5)',
    lg: '0 8px 40px rgba(0, 0, 0, 0.6)',
    glow: '0 0 24px rgba(139, 124, 248, 0.35)',
    accentGlow: '0 0 24px rgba(240, 165, 0, 0.35)',
  },
  transition: {
    fast: '120ms ease',
    normal: '220ms ease',
    slow: '380ms ease',
  },
} as const

export type Tokens = typeof tokens
