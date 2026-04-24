# Path of Praxis

Web and mobile game built with TypeScript + Vite, targeting HTML5 Canvas.

## Stack

- **Build**: Vite 6 + TypeScript 5 (strict)
- **Icons**: Lucide (tree-shakeable SVG)
- **Fonts**: Google Fonts — Cinzel (display), Inter (body)
- **Rendering recommendation**: [PixiJS](https://pixijs.com/) for game scenes (WebGL + Canvas fallback, sprite batching, built-in particle system). Vanilla Canvas is used today for lightweight background effects.

## Project structure

```
src/
  i18n/
    locales/en.ts     TranslationSchema source of truth (all locales must satisfy it)
    locales/fr.ts     Example second locale
    index.ts          t(section, key) — type-safe, locale-detected
  scenes/
    menu.ts           Homepage menu (pattern: factory → returns teardown fn)
  styles/
    main.css          Global CSS — consumes CSS custom properties from theme
  theme/
    tokens.ts         Single source of truth for all design values
    index.ts          applyTheme() writes tokens → CSS custom properties on :root
  main.ts             Bootstrap: applyTheme → initI18n → mount initial scene
```

## Key conventions

**Scenes** — each scene is `createXxxScene(container: HTMLElement): () => void`. The returned function tears down DOM and cancels animations. A future router calls these factories and manages the active scene.

**Theme** — `tokens.ts` drives both CSS (`applyTheme()`) and Canvas drawing code (import `tokens` directly). Never hard-code colour/spacing values outside `tokens.ts`.

**i18n** — `t('section', 'key')` is fully type-checked. Adding a locale = add a file in `src/i18n/locales/` that satisfies `TranslationSchema`; TypeScript enforces completeness at compile time.

## Commands

```bash
npm run dev        # Vite dev server (HMR)
npm run build      # tsc + Vite production build → dist/
npm run typecheck  # Type-check only, no emit
npm run preview    # Serve dist/ locally
```

## Mobile notes

- `viewport-fit=cover` + `env(safe-area-inset-*)` for notched devices
- `100dvh` (dynamic viewport height) avoids mobile browser chrome issues
- `touch-action: none` on body prevents scroll/zoom during gameplay
- All interactive targets are ≥ 52 px tall
