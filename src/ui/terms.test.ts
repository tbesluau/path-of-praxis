import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountTermsAcceptanceModal } from './terms'

describe('terms acceptance gate', () => {
  let parent: HTMLElement

  beforeEach(() => {
    document.body.innerHTML = ''
    parent = document.createElement('div')
    document.body.appendChild(parent)
  })

  function getCheckboxes(): HTMLInputElement[] {
    return Array.from(parent.querySelectorAll<HTMLInputElement>('.terms-checkbox'))
  }
  function getContinue(): HTMLButtonElement {
    return parent.querySelector<HTMLButtonElement>('[data-action="continue"]')!
  }

  it('mounts a backdrop with two checkboxes and a disabled Continue button', () => {
    mountTermsAcceptanceModal(parent, vi.fn())
    const backdrop = parent.querySelector('.terms-backdrop')
    expect(backdrop).not.toBeNull()
    expect(getCheckboxes()).toHaveLength(2)
    expect(getContinue().disabled).toBe(true)
  })

  it('keeps Continue disabled when only one checkbox is checked', () => {
    mountTermsAcceptanceModal(parent, vi.fn())
    const [privacy] = getCheckboxes()
    privacy.checked = true
    privacy.dispatchEvent(new Event('change', { bubbles: true }))
    expect(getContinue().disabled).toBe(true)
  })

  it('enables Continue when both checkboxes are checked', () => {
    mountTermsAcceptanceModal(parent, vi.fn())
    for (const cb of getCheckboxes()) {
      cb.checked = true
      cb.dispatchEvent(new Event('change', { bubbles: true }))
    }
    expect(getContinue().disabled).toBe(false)
  })

  it('calls onAccept once and removes the backdrop on Continue', () => {
    const onAccept = vi.fn()
    mountTermsAcceptanceModal(parent, onAccept)
    for (const cb of getCheckboxes()) {
      cb.checked = true
      cb.dispatchEvent(new Event('change', { bubbles: true }))
    }
    getContinue().click()
    expect(onAccept).toHaveBeenCalledOnce()
    expect(parent.querySelector('.terms-backdrop')).toBeNull()
  })

  it('does not dismiss when the backdrop is clicked', () => {
    const onAccept = vi.fn()
    mountTermsAcceptanceModal(parent, onAccept)
    const backdrop = parent.querySelector<HTMLElement>('.terms-backdrop')!
    backdrop.click()
    expect(parent.querySelector('.terms-backdrop')).not.toBeNull()
    expect(onAccept).not.toHaveBeenCalled()
  })

  it('opens the Privacy sub-modal without toggling the checkbox', () => {
    mountTermsAcceptanceModal(parent, vi.fn())
    const link = parent.querySelector<HTMLButtonElement>('[data-action="open-privacy"]')!
    link.click()
    const subModal = parent.querySelector('.terms-sub-backdrop')
    expect(subModal).not.toBeNull()
    expect(subModal!.querySelector('h3')).not.toBeNull()  // ### Overview rendered
    const privacyCheckbox = getCheckboxes()[0]
    expect(privacyCheckbox.checked).toBe(false)
  })

  it('opens the EULA sub-modal without toggling the checkbox', () => {
    mountTermsAcceptanceModal(parent, vi.fn())
    const link = parent.querySelector<HTMLButtonElement>('[data-action="open-eula"]')!
    link.click()
    const subModal = parent.querySelector('.terms-sub-backdrop')
    expect(subModal).not.toBeNull()
    const eulaCheckbox = getCheckboxes()[1]
    expect(eulaCheckbox.checked).toBe(false)
  })

  it('teardown function removes the backdrop', () => {
    const teardown = mountTermsAcceptanceModal(parent, vi.fn())
    teardown()
    expect(parent.querySelector('.terms-backdrop')).toBeNull()
  })

  it('teardown also removes an open sub-modal', () => {
    const teardown = mountTermsAcceptanceModal(parent, vi.fn())
    parent.querySelector<HTMLButtonElement>('[data-action="open-privacy"]')!.click()
    expect(parent.querySelector('.terms-sub-backdrop')).not.toBeNull()
    teardown()
    expect(parent.querySelector('.terms-sub-backdrop')).toBeNull()
    expect(parent.querySelector('.terms-backdrop')).toBeNull()
  })
})
