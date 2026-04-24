import './styles/main.css'
import { applyTheme } from './theme'
import { initI18n } from './i18n'
import { initRouter, navigate, registerScenes } from './core/router'
import { createMenuScene } from './scenes/menu'
import { createGameScene } from './scenes/game'

function bootstrap(): void {
  applyTheme()
  initI18n()

  const app = document.getElementById('app')!
  registerScenes({ menu: createMenuScene, game: createGameScene })
  initRouter(app)
  navigate('menu')
}

bootstrap()
