import {
  renderCharacterPreviewSvg,
  HEAD_VARIANT_LABELS,
  SHIELD_VARIANTS,
  SHIELD_VARIANT_LABELS,
  PLAYER_COLOR_LABELS,
  PLAYER_COLOR_SWATCHES,
  type HeadVariant,
  type PlayerColorKey,
  type ShieldVariant,
} from '../assets/entity-art'
import { t } from '../i18n'
import { playSound } from '../audio'

const HEAD_VARIANTS: HeadVariant[] = ['hood', 'helm', 'face', 'hat', 'horned', 'bascinet']
const COLOR_KEYS: PlayerColorKey[] = ['teal', 'red', 'orange', 'white', 'black']

export function mountCharacterCustomizeModal(
  parent: HTMLElement,
  opts: {
    initialHat:    HeadVariant
    initialShield: ShieldVariant
    initialColor:  PlayerColorKey
    // Shields exist only once Block is unlocked (first Transcendence).
    shieldsUnlocked: boolean
    onChange:     (hat: HeadVariant, shield: ShieldVariant, color: PlayerColorKey) => void
    onClose:      () => void
  },
): () => void {
  let currentHat    = opts.initialHat
  let currentShield = opts.initialShield
  let currentColor  = opts.initialColor

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop char-modal-backdrop'

  const panel = document.createElement('div')
  panel.className = 'modal-panel char-customize-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  panel.setAttribute('aria-labelledby', 'char-customize-title')

  panel.innerHTML = `
    <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
    <h2 class="modal-title" id="char-customize-title">Customize</h2>
    <div class="char-preview-wrap">
      <div class="char-preview-img"></div>
    </div>
    <div class="char-customize-section">
      <div class="char-customize-label">Headgear</div>
      <div class="char-hat-selector"></div>
    </div>
    ${opts.shieldsUnlocked ? `
    <div class="char-customize-section">
      <div class="char-customize-label">Shield</div>
      <div class="char-shield-selector"></div>
    </div>` : ''}
    <div class="char-customize-section">
      <div class="char-customize-label">Color</div>
      <div class="char-color-picker"></div>
    </div>
  `

  backdrop.appendChild(panel)
  playSound('modal.open')
  parent.appendChild(backdrop)

  const previewEl = panel.querySelector<HTMLElement>('.char-preview-img')!
  const hatSel    = panel.querySelector<HTMLElement>('.char-hat-selector')!
  const shieldSel = panel.querySelector<HTMLElement>('.char-shield-selector')
  const colorPick = panel.querySelector<HTMLElement>('.char-color-picker')!

  function updatePreview(): void {
    previewEl.innerHTML = renderCharacterPreviewSvg(currentHat, currentColor, opts.shieldsUnlocked ? currentShield : null)
  }

  function buildHatSelector(): void {
    hatSel.innerHTML = ''
    for (const variant of HEAD_VARIANTS) {
      const btn = document.createElement('button')
      btn.className = 'char-hat-btn' + (variant === currentHat ? ' char-hat-btn--active' : '')
      btn.textContent = HEAD_VARIANT_LABELS[variant]
      btn.addEventListener('click', () => {
        currentHat = variant
        buildHatSelector()
        updatePreview()
        opts.onChange(currentHat, currentShield, currentColor)
      })
      hatSel.appendChild(btn)
    }
  }

  function buildShieldSelector(): void {
    if (!shieldSel) return
    shieldSel.innerHTML = ''
    for (const variant of SHIELD_VARIANTS) {
      const btn = document.createElement('button')
      btn.className = 'char-hat-btn' + (variant === currentShield ? ' char-hat-btn--active' : '')
      btn.textContent = SHIELD_VARIANT_LABELS[variant]
      btn.addEventListener('click', () => {
        currentShield = variant
        buildShieldSelector()
        updatePreview()
        opts.onChange(currentHat, currentShield, currentColor)
      })
      shieldSel.appendChild(btn)
    }
  }

  function buildColorPicker(): void {
    colorPick.innerHTML = ''
    for (const key of COLOR_KEYS) {
      const btn = document.createElement('button')
      btn.className = 'char-color-swatch' + (key === currentColor ? ' char-color-swatch--active' : '')
      btn.title = PLAYER_COLOR_LABELS[key]
      btn.style.background = PLAYER_COLOR_SWATCHES[key]
      btn.addEventListener('click', () => {
        currentColor = key
        buildColorPicker()
        updatePreview()
        opts.onChange(currentHat, currentShield, currentColor)
      })
      colorPick.appendChild(btn)
    }
  }

  buildHatSelector()
  buildShieldSelector()
  buildColorPicker()
  updatePreview()

  const dismiss = (): void => {
    playSound('modal.close')
    backdrop.remove()
    opts.onClose()
  }

  panel.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', dismiss)
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

  return () => backdrop.remove()
}
