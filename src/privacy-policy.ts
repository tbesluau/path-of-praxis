import './styles/main.css'
import { applyTheme } from './theme'
import privacyRaw from './config/privacy.md?raw'
import { renderMarkdown } from './ui/about'

applyTheme()

const app = document.getElementById('app')!
app.innerHTML = `
  <div class="privacy-page-wrap">
    <div class="modal-panel about-panel privacy-page-panel">
      <a class="privacy-page-back" href="/">← Back to game</a>
      <h1 class="modal-title privacy-page-title">Privacy Policy</h1>
      <div class="about-body privacy-page-body">${renderMarkdown(privacyRaw)}</div>
    </div>
  </div>
`
