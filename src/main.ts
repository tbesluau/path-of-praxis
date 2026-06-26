import './styles/main.css'
import { applyTheme } from './theme'
import { initI18n } from './i18n'
import { initRouter, navigate, registerScenes } from './core/router'
import { createMenuScene } from './scenes/menu'
import { createGameScene } from './scenes/game'
import { initAds } from './ads'
import { initEntitlement } from './core/entitlement'
import { isAllowedToRun } from './core/host-guard'
import { isNativeApp } from './core/context'
import { initStorage } from './core/storage'
import { getPrefs, setPref } from './core/prefs'
import { mountTermsAcceptanceModal } from './ui/terms'
import { initAudio, playSound, suspendAudio, resumeAudio } from './audio'

async function bootstrap(): Promise<void> {
  if (!isAllowedToRun()) {
    renderBlockedNotice()
    return
  }

  // Select the storage backend before any persisted data is read (the
  // CrazyGames data store needs an async SDK init; localStorage is synchronous).
  await initStorage()

  if (isNativeApp()) document.body.classList.add('native-platform')

  applyTheme()
  initI18n()
  initAudio()

  // Single delegated listener for UI sounds.
  // pointerdown also fires on first gesture, which resumes the AudioContext.
  // Buttons that open a modal are marked data-sfx="modal" — skip them here
  // (the modal-mount function plays modal.open). Close buttons (data-action="close")
  // are also skipped — the dismiss function plays modal.close.
  document.addEventListener('pointerdown', (e) => {
    const el = (e.target as HTMLElement | null)?.closest(
      'button, [data-action], .lang-option, .targeting-opt, [role="button"], input[type="checkbox"], input[type="radio"]',
    ) as HTMLButtonElement | null
    if (!el || el.disabled) return
    if ((el as HTMLElement).dataset.sfx === 'modal') return
    // Close buttons (close/skip) are handled by their modal's dismiss(), which plays modal.close.
    if ((el as HTMLElement).dataset.action === 'close') return
    if ((el as HTMLElement).dataset.action === 'skip') return
    playSound('ui.toggle')
  }, true)

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspendAudio()
    else resumeAudio()
  })

  const app = document.getElementById('app')!

  const start = (): void => {
    registerScenes({ menu: createMenuScene, game: createGameScene })
    initRouter(app)
    navigate('menu')

    void initAds()
    void initEntitlement()
  }

  if (getPrefs().acceptedTermsV1 || !isNativeApp()) {
    start()
  } else {
    mountTermsAcceptanceModal(app, () => {
      setPref('acceptedTermsV1', true)
      start()
    })
  }
}

function renderBlockedNotice(): void {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML = `
    <div style="font-family: system-ui, -apple-system, sans-serif; color: #fff; text-align: center; padding: 24px; max-width: 360px; margin: 24vh auto; line-height: 1.5;">
      <h1 style="font-size: 1.4rem; margin: 0 0 12px">Path of Praxis</h1>
      <p style="margin: 0">Play at <a style="color:#9ad" href="https://pathofpraxis.com">pathofpraxis.com</a>.</p>
    </div>
  `
}

void bootstrap()
