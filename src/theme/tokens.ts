export const tokens = {
  color: {
    primary: '#FFD700',
    primaryHover: '#FFE85A',
    primaryActive: '#CCA800',
    surface: '#2D2D2D',
    surfaceElevated: '#383838',
    surfacePanel: '#323232',
    border: '#FFD700',
    text: '#F5F0E0',
    textMuted: '#8A8070',
    accent: '#4169E1',
    accentAlt: '#DC143C',
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
    sm: '0 2px 8px rgba(0, 0, 0, 0.5)',
    md: '0 4px 20px rgba(0, 0, 0, 0.6)',
    lg: '0 8px 40px rgba(0, 0, 0, 0.7)',
    glow: '0 0 24px rgba(255, 215, 0, 0.4)',
    accentGlow: '0 0 24px rgba(65, 105, 225, 0.4)',
  },
  transition: {
    fast: '120ms ease',
    normal: '220ms ease',
    slow: '380ms ease',
  },
} as const

export type Tokens = typeof tokens
