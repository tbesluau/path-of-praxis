import './styles/main.css'
import { applyTheme } from './theme'
import { initI18n } from './i18n'
import { initRouter, navigate, registerScenes } from './core/router'
import { createMenuScene } from './scenes/menu'
import { createGameScene } from './scenes/game'
import { initAds } from './ads'

function bootstrap(): void {
  applyTheme()
  initI18n()

  const app = document.getElementById('app')!
  registerScenes({ menu: createMenuScene, game: createGameScene })
  initRouter(app)
  navigate('menu')

  // Fire-and-forget: AdMob init on native; no-op on web. Ads still work even
  // if this fails, the SDK is just re-checked lazily on first ad request.
  void initAds()
}

bootstrap()
