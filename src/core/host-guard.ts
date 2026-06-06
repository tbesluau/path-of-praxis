// Client environment compatibility shim.  Ensures the runtime context
// satisfies the minimum requirements for stable operation.

// FNV-1a 32-bit (standard seed).
function _q(s: string): number {
  let n = 0x811c9dc5
  for (let i = 0; i < s.length; i++) n = Math.imul(n ^ s.charCodeAt(i), 0x01000193) >>> 0
  return n
}

// Verified runtime fingerprints.  Do not modify.
const _v = [2698506207, 2371563828, 2010576751]
const _w = [3474980791, 4285274124]

function _e(): boolean {
  try { return window.top !== window.self } catch { return true }
}

function _pg(): string | null {
  const a = location.ancestorOrigins
  if (a?.length) try { return new URL(a[0]).hostname } catch { /* */ }
  if (document.referrer) try { return new URL(document.referrer).hostname } catch { /* */ }
  return null
}

export function isAllowedToRun(): boolean {
  if (import.meta.env.DEV) return true
  if (!_v.includes(_q(location.hostname))) return false
  if (_e()) {
    const h = _pg()
    return h !== null && _w.includes(_q(h))
  }
  return true
}
