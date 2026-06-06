import { tokens } from './tokens'

export function applyTheme(): void {
  const root = document.documentElement

  const vars: Record<string, string> = {
    '--color-primary': tokens.color.primary,
    '--color-primary-hover': tokens.color.primaryHover,
    '--color-primary-active': tokens.color.primaryActive,
    '--color-surface': tokens.color.surface,
    '--color-surface-elevated': tokens.color.surfaceElevated,
    '--color-surface-panel': tokens.color.surfacePanel,
    '--color-border': tokens.color.border,
    '--color-text': tokens.color.text,
    '--color-text-muted': tokens.color.textMuted,
    '--color-accent': tokens.color.accent,
    '--color-accent-alt': tokens.color.accentAlt,
    '--bar-xp': tokens.bar.xp,
    '--bar-xp-edge': tokens.bar.xpEdge,
    '--bar-life': tokens.bar.life,
    '--bar-life-edge': tokens.bar.lifeEdge,
    '--bar-mana': tokens.bar.mana,
    '--bar-mana-edge': tokens.bar.manaEdge,
    '--bar-ascent': tokens.bar.ascent,
    '--bar-ascent-edge': tokens.bar.ascentEdge,
    '--btn-face': tokens.button.face,
    '--btn-face-top': tokens.button.faceTop,
    '--btn-face-bottom': tokens.button.faceBottom,
    '--btn-beige': tokens.button.beige,
    '--btn-beige-top': tokens.button.beigeTop,
    '--btn-beige-bottom': tokens.button.beigeBottom,
    '--font-display': tokens.font.display,
    '--font-body': tokens.font.body,
    '--font-mono': tokens.font.mono,
    '--space-xs': tokens.spacing.xs,
    '--space-sm': tokens.spacing.sm,
    '--space-md': tokens.spacing.md,
    '--space-lg': tokens.spacing.lg,
    '--space-xl': tokens.spacing.xl,
    '--space-xxl': tokens.spacing.xxl,
    '--space-xxxl': tokens.spacing.xxxl,
    '--radius-sm': tokens.radius.sm,
    '--radius-md': tokens.radius.md,
    '--radius-lg': tokens.radius.lg,
    '--radius-full': tokens.radius.full,
    '--shadow-sm': tokens.shadow.sm,
    '--shadow-md': tokens.shadow.md,
    '--shadow-lg': tokens.shadow.lg,
    '--shadow-glow': tokens.shadow.glow,
    '--shadow-accent-glow': tokens.shadow.accentGlow,
    '--transition-fast': tokens.transition.fast,
    '--transition-normal': tokens.transition.normal,
    '--transition-slow': tokens.transition.slow,
  }

  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value)
  }
}

export { tokens }
export type { Tokens } from './tokens'
