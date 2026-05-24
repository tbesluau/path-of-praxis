import './styles/main.css'
import { applyTheme } from './theme'
import { initI18n } from './i18n'
import { initRouter, navigate, registerScenes } from './core/router'
import { createMenuScene } from './scenes/menu'
import { createGameScene } from './scenes/game'
import { initAds } from './ads'
import { isAllowedToRun } from './core/host-guard'
import { getPrefs, setPref } from './core/prefs'
import { mountTermsAcceptanceModal } from './ui/terms'

function bootstrap(): void {
  if (!isAllowedToRun()) {
    renderBlockedNotice()
    return
  }

  applyTheme()
  initI18n()

  const app = document.getElementById('app')!

  const start = (): void => {
    registerScenes({ menu: createMenuScene, game: createGameScene })
    initRouter(app)
    navigate('menu')

    // Fire-and-forget: AdMob init on native; no-op on web. Ads still work even
    // if this fails, the SDK is just re-checked lazily on first ad request.
    void initAds()
  }

  if (getPrefs().acceptedTermsV1) {
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

bootstrap()
