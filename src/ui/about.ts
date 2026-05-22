import { t } from '../i18n'
import releaseNotesRaw from '../config/release-notes.md?raw'
import todoRaw from '../config/todo.md?raw'

function inline(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

function renderMarkdown(md: string): string {
  const lines = md.split('\n')
  const chunks: string[] = []
  const listItems: string[] = []
  const paraLines: string[] = []

  const flushList = (): void => {
    if (listItems.length === 0) return
    chunks.push(`<ul>${listItems.map(li => `<li>${li}</li>`).join('')}</ul>`)
    listItems.length = 0
  }
  const flushPara = (): void => {
    if (paraLines.length === 0) return
    chunks.push(`<p>${paraLines.join(' ')}</p>`)
    paraLines.length = 0
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '') {
      flushList(); flushPara()
    } else if (trimmed.startsWith('### ')) {
      flushList(); flushPara()
      chunks.push(`<h3 class="about-section-heading">${inline(trimmed.slice(4))}</h3>`)
    } else if (trimmed.startsWith('- ')) {
      flushPara()
      listItems.push(inline(trimmed.slice(2)))
    } else {
      flushList()
      paraLines.push(inline(trimmed))
    }
  }
  flushList(); flushPara()
  return chunks.join('')
}

export function mountAboutModal(parent: HTMLElement, onClose: () => void): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'

  let subCleanup: (() => void) | null = null
  const closeSub = (): void => { if (subCleanup) { subCleanup(); subCleanup = null } }

  const teardown = (): void => { closeSub(); backdrop.remove() }
  const dismiss = (): void => { teardown(); onClose() }

  backdrop.innerHTML = `
    <div class="modal-panel about-panel" role="dialog" aria-modal="true" aria-labelledby="about-title">
      <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
      <h2 class="modal-title" id="about-title">${t('about', 'title')}</h2>
      <div class="about-body">
        <p>${inline(t('about', 'body'))}</p>
        <h3 class="about-section-heading">${t('about', 'creditsTitle')}</h3>
        <p>${inline(t('about', 'creditsAlpha'))}</p>
        <ul>
          <li>${inline(t('about', 'creditsKenneyUi'))}</li>
          <li>${inline(t('about', 'creditsKenneyDungeon'))}</li>
          <li>${inline(t('about', 'creditsLucide'))}</li>
          <li>${inline(t('about', 'creditsFonts'))}</li>
          <li>${inline(t('about', 'creditsClaude'))}</li>
        </ul>
      </div>
      <div class="modal-actions about-actions">
        <button class="modal-btn modal-btn--ghost" data-action="release-notes">${t('about', 'releaseNotes')}</button>
        <button class="modal-btn modal-btn--ghost" data-action="todo">${t('about', 'todo')}</button>
      </div>
    </div>
  `

  parent.appendChild(backdrop)

  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', dismiss)

  backdrop.querySelector<HTMLButtonElement>('[data-action="release-notes"]')!
    .addEventListener('click', () => {
      closeSub()
      subCleanup = mountAboutSubModal(parent, t('about', 'releaseNotesTitle'), releaseNotesRaw, () => { subCleanup = null })
    })

  backdrop.querySelector<HTMLButtonElement>('[data-action="todo"]')!
    .addEventListener('click', () => {
      closeSub()
      subCleanup = mountAboutSubModal(parent, t('about', 'todoTitle'), todoRaw, () => { subCleanup = null })
    })

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) dismiss()
  })

  return teardown
}

function mountAboutSubModal(
  parent: HTMLElement,
  title: string,
  markdown: string,
  onClose: () => void,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop settings-submodal-backdrop'

  const body = renderMarkdown(markdown)

  backdrop.innerHTML = `
    <div class="modal-panel about-panel" role="dialog" aria-modal="true" aria-labelledby="about-sub-title">
      <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
      <h2 class="modal-title" id="about-sub-title">${title}</h2>
      <div class="about-body">${body}</div>
    </div>
  `

  parent.appendChild(backdrop)

  const teardown = (): void => { backdrop.remove() }
  const dismiss = (): void => { teardown(); onClose() }

  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', dismiss)

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) dismiss()
  })

  return teardown
}
