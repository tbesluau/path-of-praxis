import './styles/main.css'
import { applyTheme } from './theme'
import { initI18n } from './i18n'
import { createMenuScene } from './scenes/menu'

function bootstrap(): void {
  applyTheme()
  initI18n()

  const app = document.getElementById('app')!
  createMenuScene(app)
}

bootstrap()
