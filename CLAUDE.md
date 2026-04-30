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

## Git workflow

Every user request must follow these steps in order. No exceptions.

1. **Rebase first — always**: run `git fetch origin main && git rebase origin/main` before writing a single line of code. Skipped commits are expected (squash-merged) — just continue. This must happen at the start of every task, not just at the start of a session.
2. **Working branch**: all development happens on `claude/dev`. Never commit directly to `main`.
3. **Implement**: make the changes, run `npm run typecheck && npm test`, fix any failures.
4. **Commit**: one logical commit per request with a clear message.
5. **Push**: `git push --force-with-lease origin claude/dev` (never plain `--force`).
6. **One PR per request**: open a new pull request immediately after every push — do not wait for the user to ask. Never bundle multiple user requests into one PR. If PR #N is still open from a previous request, the rebase in step 1 will have brought those commits in; push and open a fresh PR for the new work only — do not add to an already-open PR from a prior request.
7. **Conflict resolution**: if the rebase has real file conflicts, resolve them, `git add`, then `git rebase --continue`. Never `git rebase --abort` unless explicitly asked.
8. **Never amend published commits**: create a new commit instead.

The goal of this workflow is that each user request produces exactly one conflict-free PR that CI can auto-squash-merge and deploy independently.

## Mobile notes

- `viewport-fit=cover` + `env(safe-area-inset-*)` for notched devices
- `100dvh` (dynamic viewport height) avoids mobile browser chrome issues
- `touch-action: none` on body prevents scroll/zoom during gameplay
- All interactive targets are ≥ 52 px tall
