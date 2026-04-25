import { Application, Graphics, Text, TextStyle } from 'pixi.js'
import { createIcons, User, ArrowLeft } from 'lucide'
import { tokens } from '../theme'
import { t } from '../i18n'
import { getCurrentCharacter } from '../core/character'
import type { SceneId } from '../core/router'

const CIRCLE_RADIUS = 120
const HUD_HEIGHT = 128
const REGEN_RATE = 1
const STARTING_VALUE = 50

export function createGameScene(
  container: HTMLElement,
  navigate: (to: SceneId) => void,
): () => void {
  const char = getCurrentCharacter()
  const maxLife = char?.maxLife ?? 100
  const maxMana = char?.maxMana ?? 100

  let currentLife = STARTING_VALUE
  let currentMana = STARTING_VALUE

  const el = document.createElement('div')
  el.className = 'scene scene-game'
  el.innerHTML = `
    <button class="back-btn" aria-label="Back to menu">
      <i data-lucide="arrow-left" aria-hidden="true"></i>
    </button>
    <div class="stat-bars">
      <div class="stat-bar stat-bar--life">
        <div class="stat-bar-fill stat-bar-fill--life"></div>
      </div>
      <div class="stat-bar stat-bar--mana">
        <div class="stat-bar-fill stat-bar-fill--mana"></div>
      </div>
    </div>
    <div class="game-hud">
      <button class="game-action-btn" data-label="A">A</button>
      <button class="game-action-btn" data-label="B">B</button>
      <button class="game-action-btn game-action-btn--icon" data-action="character" aria-label="Character">
        <i data-lucide="user" aria-hidden="true"></i>
      </button>
    </div>
  `
  container.appendChild(el)
  createIcons({ icons: { User, ArrowLeft } })

  const lifeFill = el.querySelector<HTMLElement>('.stat-bar-fill--life')!
  const manaFill = el.querySelector<HTMLElement>('.stat-bar-fill--mana')!

  function updateBars(): void {
    lifeFill.style.width = `${(currentLife / maxLife) * 100}%`
    manaFill.style.width = `${(currentMana / maxMana) * 100}%`
  }

  updateBars()

  const regenInterval = setInterval(() => {
    currentLife = Math.min(maxLife, currentLife + REGEN_RATE)
    currentMana = Math.min(maxMana, currentMana + REGEN_RATE)
    updateBars()
  }, 1000)

  el.querySelector<HTMLButtonElement>('.back-btn')!
    .addEventListener('click', () => navigate('menu'))

  let app: Application | null = null
  let destroyed = false
  let modalCleanup: (() => void) | null = null

  const charBtn = el.querySelector<HTMLButtonElement>('[data-action="character"]')!
  charBtn.addEventListener('click', () => {
    if (modalCleanup) {
      modalCleanup()
      modalCleanup = null
      return
    }
    modalCleanup = mountCharacterModal(el, () => { modalCleanup = null })
  })

  ;(async () => {
    try {
      const instance = new Application()
      await instance.init({
        background: tokens.color.surface,
        resizeTo: el,
        antialias: true,
        resolution: devicePixelRatio,
        autoDensity: true,
      })

      if (destroyed) {
        instance.destroy(true)
        return
      }

      app = instance

      const wrapper = document.createElement('div')
      wrapper.className = 'game-canvas-wrapper'
      wrapper.appendChild(app.canvas)
      el.insertBefore(wrapper, el.firstChild)

      const circle = new Graphics()
      circle.circle(0, 0, CIRCLE_RADIUS)
      circle.fill({ color: tokens.color.surfacePanel })
      circle.stroke({ color: tokens.color.primary, width: 3 })
      app.stage.addChild(circle)

      const label = new Text({
        text: '',
        style: new TextStyle({
          fill: tokens.color.text,
          fontSize: 72,
          fontFamily: "'Inter', sans-serif",
          fontWeight: '600',
        }),
      })
      label.anchor.set(0.5)
      app.stage.addChild(label)

      function reposition(): void {
        if (!app) return
        const { width, height } = app.screen
        circle.position.set(width / 2, (height - HUD_HEIGHT) / 2)
        label.position.set(width / 2, (height - HUD_HEIGHT) / 2)
      }

      reposition()
      app.renderer.on('resize', reposition)

      el.querySelectorAll<HTMLButtonElement>('[data-label]').forEach(btn => {
        btn.addEventListener('click', () => {
          label.text = btn.dataset['label'] ?? ''
        })
      })
    } catch (err) {
      console.error('[game] PixiJS init failed:', err)
    }
  })()

  return () => {
    destroyed = true
    clearInterval(regenInterval)
    if (modalCleanup) { modalCleanup(); modalCleanup = null }
    app?.destroy(true)
    app = null
    el.remove()
  }
}

function mountCharacterModal(parent: HTMLElement, onClose: () => void): () => void {
  const char = getCurrentCharacter()

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel char-info-panel" role="dialog" aria-modal="true" aria-labelledby="char-info-title">
      <h2 class="modal-title" id="char-info-title">${t('character', 'infoTitle')}</h2>
      <div class="char-info-row">
        <span class="char-info-label">${t('character', 'nameLabel')}</span>
        <span class="char-info-value">${char ? escapeHtml(char.name) : '—'}</span>
      </div>
      <div class="char-info-row">
        <span class="char-info-label">${t('character', 'statMaxLife')}</span>
        <span class="char-info-value char-info-value--life">${char?.maxLife ?? 100}</span>
      </div>
      <div class="char-info-row">
        <span class="char-info-label">${t('character', 'statMaxMana')}</span>
        <span class="char-info-value char-info-value--mana">${char?.maxMana ?? 100}</span>
      </div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn--ghost" data-action="close">${t('settings', 'close')}</button>
      </div>
    </div>
  `

  parent.appendChild(backdrop)

  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', () => { backdrop.remove(); onClose() })

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) { backdrop.remove(); onClose() }
  })

  return () => backdrop.remove()
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
