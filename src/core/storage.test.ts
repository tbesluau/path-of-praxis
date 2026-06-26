import { describe, it, expect, beforeEach } from 'vitest'
import { storage, setStorageBackend, type StorageBackend } from './storage'

function makeMemoryBackend(): StorageBackend & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return {
    store,
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    setItem: (k, v) => { store.set(k, v) },
    removeItem: (k) => { store.delete(k) },
  }
}

describe('storage proxy', () => {
  beforeEach(() => {
    // Reset to a fresh localStorage-style default between tests.
    try { localStorage.clear() } catch { /* */ }
    setStorageBackend({
      getItem: (k) => { try { return localStorage.getItem(k) } catch { return null } },
      setItem: (k, v) => { try { localStorage.setItem(k, v) } catch { /* */ } },
      removeItem: (k) => { try { localStorage.removeItem(k) } catch { /* */ } },
    })
  })

  it('round-trips through the default (localStorage) backend', () => {
    storage.setItem('pop:test', 'hello')
    expect(storage.getItem('pop:test')).toBe('hello')
    expect(localStorage.getItem('pop:test')).toBe('hello')
    storage.removeItem('pop:test')
    expect(storage.getItem('pop:test')).toBeNull()
  })

  it('routes through a swapped-in backend without touching localStorage', () => {
    const mem = makeMemoryBackend()
    setStorageBackend(mem)

    storage.setItem('pop:save', '{"a":1}')
    expect(mem.store.get('pop:save')).toBe('{"a":1}')
    expect(storage.getItem('pop:save')).toBe('{"a":1}')
    expect(localStorage.getItem('pop:save')).toBeNull()

    storage.removeItem('pop:save')
    expect(mem.store.has('pop:save')).toBe(false)
  })

  it('reflects a backend swap on the shared proxy reference', () => {
    const first = makeMemoryBackend()
    setStorageBackend(first)
    storage.setItem('k', 'v1')

    const second = makeMemoryBackend()
    setStorageBackend(second)
    storage.setItem('k', 'v2')

    expect(first.store.get('k')).toBe('v1')
    expect(second.store.get('k')).toBe('v2')
    expect(storage.getItem('k')).toBe('v2')
  })
})
